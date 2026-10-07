import {prepareArtwork} from './artwork.js';
import {loadImage} from './image-loader.js';
import {categories,catalogKeys,rarityColors,priceLabel as label,changeKind,reviewStats,catalogEntries} from './catalog-state.js';
import {normalizePrice,valueDelta,variantTitle} from './value-math.js';
import {formatPriceAge} from './price-core.js';
import {baseline,draftConflicts,readDraft,writeDraft} from './draft-store.js';
const $=selector=>document.querySelector(selector);
const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!=null)element.textContent=text;if(className)element.className=className;return element;};
const dialog=$('#editor-dialog'),reviewDialog=$('#review-dialog'),galleryDialog=$('#gallery-dialog'),form=$('#entry-form'),field=name=>form.elements.namedItem(name);
let auth=null,snapshot=null,category='pets',selected=null,editingNew=false,images={},assetPaths={},previewVariant='normal',publishing=false,submitted=null,renderFrame=0,syncedAt=0,restoreCandidate=null,assetCache=null,galleryTarget=null,galleryLimit=80,historyLimit=5,activities=[],latestPublication=null,publicationState=null,publicationTimer=null,publicationTries=0,checkingPublication=false,toastTimer=null;
const drafts=new Map(),previews=new Map(),bases=new Map(),conflicts=new Set();
const key=(id,cat=category)=>cat+'/'+id;
const entries=(cat=category)=>snapshot?.catalog[catalogKeys[cat]]||[];
const variants=item=>item.supportsVariants?['normal','golden','diamond']:['normal'];
const values=(item,cat=category)=>item?.supportsVariants?{...snapshot?.prices[cat]?.[item.id]}:{normal:snapshot?.prices[cat]?.[item?.id]};
const locked=()=>publishing||!!submitted;
const storage=()=>{try{return localStorage;}catch{return null;}};
function notice(text,error=false){for(const selector of ['#message','#editor-message','#toast']){const element=$(selector);element.textContent=text;element.classList.toggle('error',error);element.hidden=!text;}clearTimeout(toastTimer);if(text)toastTimer=setTimeout(()=>{$('#toast').hidden=true;},error?10000:6000);}
function modalState(){document.body.classList.toggle('modal-open',[dialog,reviewDialog,galleryDialog].some(item=>item.open));}
function showLogin(){for(const item of [dialog,reviewDialog,galleryDialog])if(item.open)item.close();auth=null;clearTimeout(publicationTimer);$('#workspace').hidden=true;$('#login-view').hidden=false;}
async function api(path,body){
  let response;try{response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'content-type':'application/json',...(auth?{'x-csrf-token':auth.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});}catch{throw new Error('Connection interrupted. Your draft is retained. Retry Confirm publish if a publication was interrupted.');}
  let data;try{data=await response.json();}catch{throw new Error('Server returned HTTP '+response.status+'. Your draft is retained.');}
  if(!response.ok){if(response.status===401&&path!=='login')showLogin();const error=new Error(data.error||'Request failed.');error.status=response.status;throw error;}return data;
}
function saveDraft(){
  if(!auth||!snapshot||restoreCandidate&&!drafts.size)return;
  const saved=writeDraft(storage(),auth.username,{head:submitted?.head||snapshot.head,changes:[...drafts.values()],base:Object.fromEntries(bases),previews:Object.fromEntries(previews),submitted});
  $('#draft-save-status').textContent=submitted?'Last publication needs confirmation':saved?'Draft saved on this device':'Storage unavailable · keep this page open';
}
function markBaseline(id,cat=category){bases.set(key(id,cat),structuredClone(baseline(snapshot,cat,id)));conflicts.delete(key(id,cat));}
function restoreBanner(){
  $('#restore-banner').hidden=!restoreCandidate;$('#dismiss-draft').disabled=!!restoreCandidate?.submitted;
  if(restoreCandidate)$('#restore-description').textContent=restoreCandidate.changes.length+' saved changes · '+formatPriceAge(new Date(restoreCandidate.updated).toISOString())+(restoreCandidate.submitted?' · restore to confirm the last publication':'');
}
async function start(session){
  auth={...session,site:session.site||'https://petuniverse-values.pl'};drafts.clear();previews.clear();bases.clear();conflicts.clear();submitted=null;latestPublication=null;publicationState=null;snapshot=null;assetCache=null;restoreCandidate=readDraft(storage(),auth.username);$('#account-name').textContent=auth.username;$('#login-view').hidden=true;$('#workspace').hidden=false;$('#publication-banner').hidden=true;restoreBanner();
  try{await reload();}catch(error){notice(error.message,true);}
}
function updateSummary(){
  if(!snapshot)return;const stats=reviewStats(drafts),total=Object.values(catalogKeys).reduce((sum,name)=>sum+snapshot.catalog[name].length,0);
  $('#entry-count').textContent=total;$('#stat-total').textContent=total;$('#stat-pending').textContent=stats.total;$('#stat-removals').textContent=stats.delete;$('#stat-pending-label').textContent=conflicts.size?'Review conflicts':stats.total?'Ready to review':'Up to date';
  $('#review-jump').textContent=stats.total?'Review '+stats.total+' changes':'Review changes';$('#sync-label').textContent='Catalog synced '+formatPriceAge(new Date(syncedAt).toISOString());$('#head-link').textContent='GitHub revision · '+snapshot.head.slice(0,7);$('#head-link').href='https://github.com/Zerqoon/Pet-Sim-test/commit/'+snapshot.head;$('#head-link').hidden=false;
  $('#pending-dock').hidden=!stats.total;$('#dock-title').textContent=submitted?'Confirm last publication':stats.total+' pending '+(stats.total===1?'change':'changes');document.body.classList.toggle('has-drafts',!!stats.total);
}
function renderCatalog(){
  if(!snapshot)return;$('#tabs').replaceChildren();
  for(const [name,title] of Object.entries(categories)){const button=node('button');button.type='button';button.setAttribute('aria-pressed',String(name===category));button.disabled=locked();button.append(node('span',title),node('span',entries(name).length+[...drafts.values()].filter(change=>change.category===name&&change.add&&!entries(name).some(item=>item.id===change.id)).length,'tab-count'));button.addEventListener('click',()=>{category=name;selected=null;renderCatalog();});$('#tabs').append(button);}
  $('#item-filter').hidden=category!=='items';$('#rarity-filter').hidden=category==='codes';$('#search').placeholder='Search '+categories[category].toLowerCase()+'…';
  const filters={term:$('#search').value,group:$('#item-filter').value,rarity:$('#rarity-filter').value,sort:$('#sort').value},rows=catalogEntries(snapshot,drafts,category,filters),list=$('#catalog-list');list.replaceChildren();list.setAttribute('aria-busy',String(publishing));
  $('#result-count').textContent=rows.length+' '+(rows.length===1?'card':'cards')+' · '+categories[category];$('#reset-filters').hidden=!filters.term&&(category!=='items'||filters.group==='all')&&(category==='codes'||filters.rarity==='all')&&filters.sort==='catalog';
  for(const {original,item,draft} of rows){
    const kind=draft?changeKind(draft):null,button=node('button',null,'entry'+(kind==='delete'?' deleting':'')+(conflicts.has(key(item.id))?' conflict':'')+(selected?.id===item.id?' selected':''));button.type='button';button.disabled=locked();button.style.setProperty('--rarity',rarityColors[item.rarity]||'#65d8ff');button.setAttribute('aria-label',item.name+(kind==='delete'?', queued for removal':', edit card'));
    if(category!=='codes'){const art=node('span',null,'entry-art'),img=node('img'),missing=node('span','Image unavailable','image-missing');img.alt='';img.loading='lazy';img.decoding='async';missing.hidden=true;art.append(img,missing);button.append(art);loadImage(img,{path:draft?.assetPaths?.normal||item.image||item.variantImages?.normal,ref:snapshot.head,site:auth?.site,preview:previews.get(key(item.id))?.normal?.preview},()=>{missing.hidden=false;});}else button.append(node('span','⌘','code-art'));
    const text=node('span',null,'entry-text');text.append(node('strong',item.name),node('small',category==='codes'?item.status:item.rarity));button.append(text);
    if(category==='codes')button.append(node('span',item.code,'code-value'));else if(item.supportsVariants){const prices=node('span',null,'entry-prices'),current=draft?.prices||values(original);for(const variant of variants(item)){const row=node('span');row.append(node('small',variantTitle(variant)),node('strong',label(current[variant])));prices.append(row);}button.append(prices);}else button.append(node('span',label(draft?.prices&&Object.hasOwn(draft.prices,'normal')?draft.prices.normal:values(original).normal),'value'));
    button.append(node('span',conflicts.has(key(item.id))?'Review conflict':kind==='delete'?'Queued for removal':kind==='add'?'New card · in review':draft?'Edited · in review':'Click to edit','card-action'));
    if(draft)button.append(node('span',conflicts.has(key(item.id))?'Review':kind==='delete'?'Removal':kind==='add'?'New':'Edited','card-status '+kind));
    button.addEventListener('click',()=>openEntry(original,!!draft?.add));list.append(button);
  }
  if(!rows.length){const empty=node('div',null,'empty-state');empty.append(node('span','⌕','empty-icon'),node('h3','No cards found'),node('p','Try another name or reset your filters.'));list.append(empty);}updateSummary();
}
function scheduleCatalog(){if(!renderFrame)renderFrame=requestAnimationFrame(()=>{renderFrame=0;renderCatalog();});}
function editorTab(name){for(const button of document.querySelectorAll('[data-editor-tab]')){const active=button.dataset.editorTab===name;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}for(const panel of document.querySelectorAll('[data-editor-panel]'))panel.hidden=panel.dataset.editorPanel!==name;}
function updateEditorActions(){const removal=drafts.get(key(selected?.id))?.action==='delete';const invalid=[...$('#price-inputs').querySelectorAll('input')].some(input=>input.getAttribute('aria-invalid')==='true');$('#save-entry').disabled=locked()||removal||invalid||Object.values(images).some(record=>!record.ready||record.expires<Date.now());}
function previewUpdate(){
  if(!selected||!auth)return;const item={...selected,supportsVariants:field('supportsVariants').checked};if(!variants(item).includes(previewVariant))previewVariant='normal';
  const codes=category==='codes',rarity=field('rarity').value;$('#preview-name').textContent=field('name').value||'New card';$('#preview-rarity').textContent=codes?field('status').value:rarity;$('#preview-rarity').style.color=rarityColors[rarity]||'#bca0ff';$('#preview-source').textContent=field('source').value;$('#preview-code').hidden=!codes;$('#preview-image').hidden=codes;$('#preview-missing').hidden=true;
  const input=[...$('#price-inputs').querySelectorAll('input')].find(input=>input.dataset.variant===previewVariant);let price;try{price=normalizePrice(input?.value).label;}catch{price='Invalid price';}$('#preview-value').textContent=codes?field('code').value||'Your code':price;
  if(!codes){const path=assetPaths[previewVariant]||(previewVariant==='normal'?field('image').value:selected.variantImages?.[previewVariant]);loadImage($('#preview-image'),{path,ref:snapshot.head,site:auth.site,preview:images[previewVariant]?.preview},()=>{$('#preview-missing').hidden=false;});}
  $('#preview-variants').replaceChildren();if(!codes&&item.supportsVariants)for(const variant of variants(item)){const button=node('button',variantTitle(variant));button.type='button';button.setAttribute('aria-pressed',String(variant===previewVariant));button.addEventListener('click',()=>{previewVariant=variant;previewUpdate();});$('#preview-variants').append(button);}
}
function buildVariants(item){
  const keys=variants(item);for(const variant of Object.keys(images))if(!keys.includes(variant))delete images[variant];for(const variant of Object.keys(assetPaths))if(!keys.includes(variant))delete assetPaths[variant];
  const prices=$('#price-inputs'),art=$('#artwork-inputs'),saved={};for(const input of prices.querySelectorAll('input'))saved[input.dataset.variant]=input.value;prices.replaceChildren();art.replaceChildren();art.classList.toggle('single',keys.length===1);
  const draft=drafts.get(key(item.id)),initial=draft?.prices||(editingNew?{}:values(item)),old=values(selected);
  for(const variant of keys){
    const title=variantTitle(variant),wrapper=node('label',null,'price-field'),input=node('input'),comparison=node('span',null,'price-comparison'),numbers=node('span'),delta=node('span',null,'delta');input.dataset.variant=variant;input.value=saved[variant]??label(initial[variant]);input.maxLength=40;input.placeholder='Not Price';input.setAttribute('aria-label',title+' value');comparison.append(numbers,delta);wrapper.append(node('span',title),input,comparison);prices.append(wrapper);
    const update=()=>{const result=valueDelta(old[variant],input.value);input.setAttribute('aria-invalid',String(!result.valid));numbers.textContent=result.valid?result.before+' → '+result.after:'Invalid value';delta.textContent=result.text;delta.className='delta '+result.kind;updateEditorActions();previewUpdate();};input.addEventListener('input',update);update();
    const tile=node('div',null,'artwork-tile'),frame=node('div',null,'artwork-frame'),img=node('img',null,'art-preview'),missing=node('span','No artwork','image-missing'),status=node('span',images[variant]?.ready?'New artwork ready':assetPaths[variant]?'Selected from library':'Current artwork','artwork-status');img.alt=title+' artwork';missing.hidden=true;frame.append(img,missing);tile.append(node('span',title,'artwork-title'),frame,status);
    const upload=node('input');upload.type='file';upload.accept='image/png';upload.setAttribute('aria-label',title+' PNG');
    const uploadButton=node('button','Upload PNG','outline'),browse=node('button','Browse assets','subtle');uploadButton.type=browse.type='button';uploadButton.addEventListener('click',()=>upload.click());browse.addEventListener('click',()=>openGallery(variant));
    const restore=()=>{missing.hidden=true;const path=assetPaths[variant]||(variant==='normal'?field('image').value||item.image||item.variantImages?.normal:item.variantImages?.[variant]);loadImage(img,{path,ref:snapshot.head,site:auth?.site,preview:images[variant]?.preview},()=>{missing.hidden=false;});};restore();
    const prepare=async file=>{
      if(!file||locked()||!auth||uploadButton.disabled)return;const bucket=images,previous=bucket[variant],sessionId=selected.id,sessionCategory=category,record={id:crypto.randomUUID(),ready:false,expires:Date.now()+23*3600000};bucket[variant]=record;uploadButton.disabled=browse.disabled=true;status.textContent='Preparing PNG…';updateEditorActions();
      try{const prepared=await prepareArtwork(file);record.preview=prepared.preview;loadImage(img,{preview:prepared.preview});missing.hidden=true;status.textContent='Uploading PNG…';await api('artwork',{id:record.id,content:prepared.content});record.ready=true;status.textContent='Ready · '+prepared.width+' × '+prepared.height;status.classList.add('ready');if(auth&&images===bucket&&selected?.id===sessionId&&category===sessionCategory){delete assetPaths[variant];previewUpdate();notice(title+' artwork ready. Save to review when ready.');}}
      catch(error){if(previous)bucket[variant]=previous;else delete bucket[variant];upload.value='';status.textContent='Upload failed · try again';status.classList.remove('ready');if(auth&&images===bucket){restore();previewUpdate();notice(error.message,true);}}
      finally{uploadButton.disabled=browse.disabled=false;if(images===bucket)updateEditorActions();}
    };
    upload.addEventListener('change',()=>prepare(upload.files[0]));tile.addEventListener('dragover',event=>{event.preventDefault();if(!locked())tile.classList.add('drag-over');});tile.addEventListener('dragleave',()=>tile.classList.remove('drag-over'));tile.addEventListener('drop',event=>{event.preventDefault();tile.classList.remove('drag-over');prepare(event.dataTransfer.files[0]);});tile.append(uploadButton,browse,upload,node('span','or drop a PNG here','drop-hint'));art.append(tile);
  }
  updateEditorActions();previewUpdate();
}
function openEntry(original,isNew){
  if(locked()||!snapshot)return;if(restoreCandidate){notice('Restore or discard the saved draft first.',true);return;}selected=original;editingNew=isNew;const draft=drafts.get(key(original.id)),item={...original,...draft?.metadata},removal=draft?.action==='delete';images={...previews.get(key(original.id))};assetPaths={...draft?.assetPaths};previewVariant='normal';item.image||=item.variantImages?.normal||'';
  $('#editor-message').hidden=true;form.reset();form.hidden=false;$('#editor-empty').hidden=true;$('#editor-title').textContent=isNew?'Add a new card':item.name;$('#entry-badge').textContent=categories[category].toUpperCase()+' / '+(removal?'QUEUED FOR REMOVAL':isNew?'NEW CARD':'EDIT CARD');
  for(const name of ['name','id','rarity','source','description','image','bestPct','itemGroup','code','status'])field(name).value=item[name]??(name==='rarity'?'Exclusive':name==='status'?'active':name==='itemGroup'?'general':'');field('id').disabled=!isNew;field('supportsVariants').checked=!!(item.supportsVariants||draft?.supportsVariants);
  const codes=category==='codes';$('#code-fields').hidden=!codes;$('#metadata-row').hidden=codes;$('#group-label').hidden=category!=='items';$('#best-label').hidden=category!=='pets';$('#variants-toggle').hidden=category!=='pets'||!isNew;for(const button of document.querySelectorAll('[data-editor-tab]'))button.hidden=codes&&button.dataset.editorTab!=='details';
  $('#new-category-label').hidden=!isNew;$('#new-category').value=category;$('#price-inputs').replaceChildren();$('#editor-details').disabled=removal;$('#remove-draft').hidden=!draft||removal;$('#delete-entry').hidden=isNew||removal;$('#delete-confirm').hidden=!removal;$('#confirm-delete').hidden=removal&&!conflicts.has(key(original.id));$('#cancel-delete').hidden=removal;$('#undo-delete').hidden=!removal;
  $('#delete-title').textContent=removal?'Queued for removal':'Remove this card?';$('#delete-description').textContent=conflicts.has(key(original.id))?'This card changed since your draft. Review it, then confirm removal again.':item.supportsVariants?'The card and all variant prices will be removed together when you publish.':codes?'The code will be removed when you publish.':'The card and its price will be removed when you publish.';
  editorTab(codes||isNew?'details':'values');buildVariants({...item,supportsVariants:field('supportsVariants').checked});renderCatalog();if(!dialog.open)dialog.showModal();modalState();if(conflicts.has(key(original.id))&&!removal)notice('This card changed since your draft. Compare with the current values, then save it again to confirm your edit.',true);
}
function discardDraft(id,cat=category){drafts.delete(key(id,cat));previews.delete(key(id,cat));bases.delete(key(id,cat));conflicts.delete(key(id,cat));saveDraft();renderReview();renderCatalog();}
function openReview(){renderReview();if(!reviewDialog.open)reviewDialog.showModal();modalState();}
function renderReview(){
  if(!snapshot)return;const list=$('#review-list'),stats=reviewStats(drafts);list.replaceChildren();$('#draft-count').textContent=stats.total;const parts=[[stats.add,'new'],[stats.update,'edited'],[stats.delete,'removed']].filter(([count])=>count).map(([count,text])=>count+' '+text);
  $('#review-summary').textContent=submitted?'Confirm the last publication before making further edits':conflicts.size?conflicts.size+' conflicts need review':parts.join(' · ')||'No pending changes';
  const expired=[...previews.values()].some(records=>Object.values(records).some(record=>!record.ready||record.expires<Date.now()));
  for(const selector of ['#publish','#dock-publish']){$(selector).disabled=!stats.total||publishing||!!conflicts.size||expired&&!submitted;$(selector).textContent=publishing?'Publishing…':submitted?'Confirm publish':stats.total?'Publish '+stats.total+' →':'Publish →';}
  for(const selector of ['#clear-review','#add','#add-top','#reload','#logout'])$(selector).disabled=locked()||(selector==='#clear-review'&&!stats.total);for(const button of document.querySelectorAll('#catalog-list button,#tabs button'))button.disabled=locked();document.body.classList.toggle('is-publishing',publishing);$('#catalog-list').setAttribute('aria-busy',String(publishing));
  for(const [id,draft] of drafts){
    const kind=changeKind(draft),before=entries(draft.category).find(item=>item.id===draft.id),name=draft.metadata?.name||before?.name||bases.get(id)?.item?.name||draft.id,row=node('div',null,'review-item '+kind),text=node('div',null,'review-content'),buttons=node('div',null,'button-row');
    const path=draft.assetPaths?.normal||draft.metadata?.image||before?.image||before?.variantImages?.normal;if(draft.category!=='codes'&&path){const img=node('img',null,'review-thumb');img.alt='';loadImage(img,{path,ref:snapshot.head,site:auth?.site,preview:previews.get(id)?.normal?.preview});row.append(img);}else row.append(node('span',kind==='delete'?'−':kind==='add'?'+':'↗','review-symbol'));
    text.append(node('span',kind==='delete'?'REMOVE':kind==='add'?'ADD':'UPDATE','change-tag '+kind),node('strong',name),node('small',categories[draft.category]));
    if(kind==='delete')text.append(node('p',before?.supportsVariants?'Card and all variant prices will be removed.':'Removed from the catalog when you publish.','hint'));
    else if(draft.prices){const old=before?values(before,draft.category):{};let count=0;for(const [variant,value] of Object.entries(draft.prices)){const delta=valueDelta(old[variant],value);if(kind==='add'||delta.kind!=='same'){text.append(node('p',variantTitle(variant)+': '+delta.before+' → '+delta.after+' · '+delta.text,'hint'));count++;}}if(!count)text.append(node('p','Card details or artwork updated.','hint'));}
    if(conflicts.has(id))text.append(node('p','Changed since your draft · review before publishing','review-conflict'));
    if(Object.values(previews.get(id)||{}).some(record=>!record.ready||record.expires<Date.now()))text.append(node('p','Artwork expired · upload the PNG again','review-conflict'));
    const edit=node('button',conflicts.has(id)?'Review conflict':'Edit','outline');edit.type='button';edit.disabled=locked();edit.addEventListener('click',()=>{category=draft.category;if(reviewDialog.open)reviewDialog.close();openEntry(before||bases.get(id)?.item||{...draft.metadata,id:draft.id,supportsVariants:draft.supportsVariants},!!draft.add||!before);});
    const undo=node('button',kind==='delete'?'Undo':'Discard','subtle');undo.type='button';undo.disabled=locked();undo.setAttribute('aria-label','Discard change to '+name);undo.addEventListener('click',()=>discardDraft(draft.id,draft.category));buttons.append(edit,undo);row.append(text,buttons);list.append(row);
  }
  if(!stats.total){const empty=node('div',null,'review-empty');empty.append(node('span','✓','review-empty-icon'),node('div','No pending changes.'),node('small','Saved edits, additions and removals appear here.'));list.append(empty);}updateSummary();
}
function activitySummary(entry){const summary=(()=>{try{return JSON.parse(entry.summary);}catch{return [];}})(),parts=[];for(const [prefix,name] of [['Added ','added'],['Updated ','updated'],['Removed ','removed']]){const count=summary.filter(text=>text.startsWith(prefix)).length;if(count)parts.push(count+' '+name);}return {summary,description:parts.join(' · ')||summary.length+' changes'};}
function renderActivity(){
  const list=$('#activity-list'),opened=new Set([...list.querySelectorAll('details[open]')].map(item=>item.dataset.sha));list.replaceChildren();
  for(const entry of activities.slice(0,historyLimit)){
    const row=node('details',null,'activity-item'),summary=node('summary'),text=node('span',null,'activity-content'),date=new Date(entry.created);row.dataset.sha=entry.sha;row.open=opened.has(entry.sha);const brief=activitySummary(entry);text.append(node('strong',entry.username+' · '+brief.description),node('small',formatPriceAge(date.toISOString())));text.title=date.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});summary.append(node('span',entry.username.slice(0,1),'activity-avatar'),text,node('span',entry.sent?'Discord delivered':entry.status>=400?'Discord retry queued':'Discord queued','delivery-status'+(entry.sent?' delivered':'')));row.append(summary);
    const detail=node('div',null,'activity-detail'),link=node('a','View GitHub commit ↗');link.href='https://github.com/Zerqoon/Pet-Sim-test/commit/'+entry.sha;link.target='_blank';link.rel='noopener noreferrer';
    if(entry.details?.length)for(const change of entry.details){const line=node('div',null,'activity-change');line.append(node('strong',(change.kind==='delete'?'Removed ':change.kind==='add'?'Added ':'Updated ')+change.name));const changes=change.prices.filter(price=>price.changed).map(price=>variantTitle(price.variant)+': '+price.before+' → '+price.after);line.append(node('small',change.kind==='delete'?'Card and prices removed':changes.join(' · ')||(change.fields.length?'Card details updated':'Artwork updated')));detail.append(line);}else for(const description of brief.summary)detail.append(node('div',description,'activity-change'));
    detail.append(link);row.append(detail);list.append(row);
  }
  if(!activities.length)list.append(node('p','No publications yet.','empty'));$('#more-history').hidden=activities.length<=historyLimit;$('#more-history').textContent='Show '+Math.min(5,activities.length-historyLimit)+' more';
}
function renderPublication(){
  if(!auth||!latestPublication)return;$('#publication-banner').hidden=false;$('#publication-description').textContent=(latestPublication.username||auth.username)+' · '+formatPriceAge(new Date(latestPublication.created).toISOString());const container=$('#publication-states');container.replaceChildren();container.append(node('span','✓ GitHub saved','publication-chip live'));
  const website=publicationState?.website;container.append(node('span',website==='live'?'✓ Website live':website==='updating'?'Website updating':checkingPublication?'Checking website…':'Website status unconfirmed','publication-chip '+(website==='live'?'live':'updating')));
  const discord=publicationState?.discord;container.append(node('span',discord==='delivered'?'✓ Discord delivered':discord==='retry'?'Discord retry queued':'Discord queued','publication-chip '+(discord==='delivered'?'live':'')));$('#check-publication').disabled=checkingPublication;
}
async function checkPublication(){
  if(!auth||!latestPublication||checkingPublication)return;const sha=latestPublication.sha;checkingPublication=true;renderPublication();
  try{const state=await api('publication?sha='+sha);if(latestPublication?.sha===sha)publicationState=state;}catch{if(latestPublication?.sha===sha)publicationState={website:'unknown',discord:publicationState?.discord||'queued'};}finally{checkingPublication=false;if(auth)renderPublication();}
  clearTimeout(publicationTimer);if(auth&&latestPublication?.sha===sha&&publicationTries++<20&&(publicationState?.website!=='live'||publicationState?.discord!=='delivered'))publicationTimer=setTimeout(()=>{if(!document.hidden)checkPublication();},30000);
}
async function activity(){const result=await api('activity');activities=result.entries;renderActivity();const latest=activities[0];if(latest?.tracked&&(!latestPublication||latest.created>latestPublication.created)){latestPublication=latest;publicationState={website:'unknown',discord:latest.sent?'delivered':'queued'};publicationTries=0;checkPublication();}}
async function reload(){
  $('#catalog-list').setAttribute('aria-busy','true');
  try{const prior=snapshot,saved={changes:[...drafts.values()],base:Object.fromEntries(bases)};snapshot=await api('catalog');syncedAt=Date.now();if(prior?.head!==snapshot.head)assetCache=null;if(drafts.size&&!submitted){conflicts.clear();for(const id of draftConflicts(snapshot,saved))conflicts.add(id);saveDraft();}selected=null;renderCatalog();renderReview();try{await activity();}catch{if(auth)$('#activity-list').replaceChildren(node('p','History is temporarily unavailable.','empty'));}}
  finally{$('#catalog-list').setAttribute('aria-busy',String(publishing));}
}
function addEntry(){openEntry({id:'',name:'',rarity:'Exclusive',source:'',description:'',image:'',status:'active'},true);}
function renderGallery(){
  if(!assetCache)return;const term=$('#gallery-search').value.trim().toLowerCase(),group=$('#gallery-category').value,filtered=assetCache.assets.filter(item=>(group==='all'||item.path.startsWith('assets/'+group+'/'))&&item.path.toLowerCase().includes(term));$('#gallery-list').replaceChildren();$('#gallery-status').textContent='Showing '+Math.min(galleryLimit,filtered.length)+' of '+filtered.length+' PNG assets';
  for(const asset of filtered.slice(0,galleryLimit)){const button=node('button',null,'asset-choice'),img=node('img');button.type='button';img.alt='';img.loading='lazy';button.title=asset.path;loadImage(img,{path:asset.path,ref:assetCache.head,site:auth?.site});button.append(img,node('span',asset.path.split('/').at(-1).replace(/\.png$/i,'')));button.addEventListener('click',()=>{const target=galleryTarget;if(!target||target.id!==selected?.id||target.category!==category||locked())return;assetPaths[target.variant]=asset.path;delete images[target.variant];if(target.variant==='normal')field('image').value=asset.path;galleryDialog.close();buildVariants({...selected,supportsVariants:field('supportsVariants').checked});notice(variantTitle(target.variant)+' image selected. Save to review when ready.');});$('#gallery-list').append(button);}
  if(filtered.length>galleryLimit){const more=node('button','Show more assets','outline');more.type='button';more.style.gridColumn='1 / -1';more.addEventListener('click',()=>{galleryLimit+=80;renderGallery();});$('#gallery-list').append(more);}
}
async function openGallery(variant){
  if(locked()||!auth)return;galleryTarget={id:selected.id,category,variant};galleryLimit=80;$('#gallery-search').value='';$('#gallery-category').value=category;$('#gallery-title').textContent='Choose '+variantTitle(variant).toLowerCase()+' artwork';$('#gallery-list').replaceChildren();$('#gallery-status').textContent='Loading PNG assets from your repository…';if(!galleryDialog.open)galleryDialog.showModal();modalState();
  try{if(assetCache?.head!==snapshot.head){const head=snapshot.head,result=await api('assets?ref='+head);assetCache={head,assets:result.assets};}if(galleryDialog.open)renderGallery();}catch(error){$('#gallery-status').textContent=error.message;}
}
async function publish(){
  if(publishing||!drafts.size||conflicts.size||!auth)return;if(restoreCandidate){notice('Restore or discard the saved draft first.',true);return;}
  if(!submitted&&[...previews.values()].some(records=>Object.values(records).some(record=>!record.ready||record.expires<Date.now()))){notice('Upload expired artwork again before publishing.',true);openReview();return;}
  publishing=true;submitted||={id:crypto.randomUUID(),head:snapshot.head,changes:structuredClone([...drafts.values()])};saveDraft();renderReview();if(dialog.open)dialog.close();
  try{
    const result=await api('publish',submitted);drafts.clear();previews.clear();bases.clear();conflicts.clear();submitted=null;saveDraft();if(reviewDialog.open)reviewDialog.close();latestPublication={sha:result.sha,created:result.created,username:auth.username};publicationState={website:'unknown',discord:'queued'};publicationTries=0;
    try{await reload();notice('Saved to GitHub. Checking your website and Discord delivery.');}catch{notice('Saved to GitHub ('+result.sha.slice(0,7)+'). Refresh to load the published catalog.');}checkPublication();
  }catch(error){
    if([400,403,413,415].includes(error.status)||error.status===409&&!/in progress/i.test(error.message)){submitted=null;saveDraft();}
    notice(error.message+(submitted?' Your draft is retained. Use Confirm publish to check the same operation.':error.status===409?' Refresh, review any conflicts, then publish again.':''),true);
  }finally{publishing=false;renderReview();}
}
$('#login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;$('#login-message').textContent='Signing in…';try{const data=new FormData(event.target);await start(await api('login',{username:data.get('username'),password:data.get('password')}));event.target.reset();$('#login-message').textContent='';}catch(error){if(auth)notice(error.message,true);else $('#login-message').textContent=error.message;}finally{button.disabled=false;}});
$('#logout').addEventListener('click',async()=>{if(locked())return;if(drafts.size&&!confirm('Keep the draft on this device and sign out?'))return;saveDraft();try{await api('logout',{});drafts.clear();previews.clear();bases.clear();conflicts.clear();restoreCandidate=null;showLogin();}catch(error){notice(error.message,true);}});
$('#reload').addEventListener('click',async()=>{if(locked())return;try{await reload();notice(conflicts.size?'Catalog refreshed. Review the changed cards before publishing.':'Latest catalog loaded. Your draft is retained.',!!conflicts.size);}catch(error){notice(error.message,true);}});
$('#restore-draft').addEventListener('click',()=>{
  if(!restoreCandidate||!snapshot)return;const saved=restoreCandidate;drafts.clear();previews.clear();bases.clear();conflicts.clear();submitted=saved.submitted||null;
  for(const change of saved.changes){const id=key(change.id,change.category);if(!submitted&&change.action==='delete'&&!entries(change.category).some(item=>item.id===change.id))continue;drafts.set(id,change);bases.set(id,saved.base[id]);const records={...saved.previews[id]};for(const record of Object.values(records))if(record.expires<Date.now())record.ready=false;previews.set(id,records);}
  if(!submitted){for(const id of draftConflicts(snapshot,{changes:[...drafts.values()],base:Object.fromEntries(bases)}))conflicts.add(id);for(const [id,records] of previews)if(Object.values(records).some(record=>!record.ready))conflicts.add(id);}
  restoreCandidate=null;restoreBanner();saveDraft();renderReview();renderCatalog();notice(submitted?'Draft restored. Confirm the last publication to check its result.':conflicts.size?'Draft restored. Review conflicts and expired artwork before publishing.':'Your draft has been restored.',!!conflicts.size);
});
$('#dismiss-draft').addEventListener('click',()=>{if(restoreCandidate?.submitted)return;if(!confirm('Discard the saved draft from this device?'))return;restoreCandidate=null;restoreBanner();saveDraft();});
$('#search').addEventListener('input',scheduleCatalog);for(const selector of ['#item-filter','#rarity-filter','#sort'])$(selector).addEventListener('change',renderCatalog);
$('#reset-filters').addEventListener('click',()=>{$('#search').value='';$('#item-filter').value='all';$('#rarity-filter').value='all';$('#sort').value='catalog';renderCatalog();});
for(const selector of ['#add','#add-top'])$(selector).addEventListener('click',addEntry);
$('#new-category').addEventListener('change',event=>{if(Object.values(images).some(record=>!record.ready)){event.target.value=category;notice('Wait for the upload to finish.',true);return;}if(confirm('Switch category and clear this new card form?')){category=event.target.value;addEntry();}else event.target.value=category;});
for(const [button,modal] of [['#close-editor',dialog],['#close-review',reviewDialog],['#close-gallery',galleryDialog]])$(button).addEventListener('click',()=>modal.close());
for(const modal of [dialog,reviewDialog,galleryDialog]){modal.addEventListener('close',modalState);modal.addEventListener('click',event=>{if(event.target===modal){const rect=modal.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)modal.close();}});}galleryDialog.addEventListener('close',()=>{galleryTarget=null;});
for(const button of document.querySelectorAll('[data-editor-tab]')){button.addEventListener('click',()=>editorTab(button.dataset.editorTab));button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...document.querySelectorAll('[data-editor-tab]')].filter(item=>!item.hidden),index=tabs.indexOf(button),target=tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];editorTab(target.dataset.editorTab);target.focus();});}
form.addEventListener('input',previewUpdate);form.addEventListener('change',previewUpdate);
field('name').addEventListener('input',()=>{if(editingNew)field('id').value=field('name').value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);});
field('image').addEventListener('input',()=>{if(assetPaths.normal&&assetPaths.normal!==field('image').value.trim())delete assetPaths.normal;previewUpdate();});
field('supportsVariants').addEventListener('change',()=>buildVariants({...selected,supportsVariants:field('supportsVariants').checked}));
$('#remove-draft').addEventListener('click',()=>{const original=entries().find(item=>item.id===selected.id);discardDraft(selected.id);if(original)openEntry(original,false);else dialog.close();});
$('#delete-entry').addEventListener('click',()=>{if(Object.values(images).some(record=>!record.ready)){notice('Wait for the upload to finish.',true);return;}$('#delete-confirm').hidden=false;$('#confirm-delete').focus();});
$('#cancel-delete').addEventListener('click',()=>{$('#delete-confirm').hidden=true;});
$('#confirm-delete').addEventListener('click',()=>{if(locked()||editingNew||!selected)return;if(Object.values(images).some(record=>!record.ready)){notice('Wait for the upload to finish.',true);return;}if(!drafts.has(key(selected.id))&&drafts.size>=20){notice('Publish at most 20 changes at a time.',true);return;}drafts.set(key(selected.id),{category,id:selected.id,action:'delete'});previews.delete(key(selected.id));markBaseline(selected.id);saveDraft();dialog.close();renderReview();renderCatalog();notice(selected.name+' queued for removal.');});
$('#undo-delete').addEventListener('click',()=>{const original=entries().find(item=>item.id===selected.id);discardDraft(selected.id);if(original)openEntry(original,false);else dialog.close();});
$('#clear-review').addEventListener('click',()=>{if(locked()||!confirm('Discard all pending changes?'))return;drafts.clear();previews.clear();bases.clear();conflicts.clear();saveDraft();renderReview();renderCatalog();notice('Draft cleared.');});
form.addEventListener('submit',event=>{
  event.preventDefault();if(locked())return;
  try{
    if(restoreCandidate)throw new Error('Restore or discard the saved draft first.');if(drafts.get(key(selected.id))?.action==='delete')throw new Error('Undo removal before editing.');
    const id=field('id').value.trim(),metadata={name:field('name').value.trim(),source:field('source').value.trim(),description:field('description').value.trim().replace(/\r?\n/g,' ')},current=entries().find(item=>item.id===id);
    if(!metadata.name){editorTab('details');field('name').focus();throw new Error('Enter a card name.');}if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)){editorTab('details');throw new Error('Use a lowercase ID with letters, numbers and hyphens.');}if(!editingNew&&!current)throw new Error('This card was removed. Refresh the catalog first.');
    if(editingNew&&current)throw new Error('This identifier already exists.');if(editingNew&&id!==selected.id&&drafts.has(key(id)))throw new Error('Another pending card uses this identifier.');
    const change={category,id,add:editingNew,metadata};
    if(category==='codes'){metadata.code=field('code').value.trim();metadata.status=field('status').value;if(!metadata.code){editorTab('details');throw new Error('Enter a reward code.');}}
    else{
      metadata.rarity=field('rarity').value;metadata.image=field('image').value.trim();if(category==='items')metadata.itemGroup=field('itemGroup').value;if(category==='pets'){metadata.bestPct=field('bestPct').value===''?null:Number(field('bestPct').value);if(metadata.bestPct!==null&&(!Number.isFinite(metadata.bestPct)||metadata.bestPct<0||metadata.bestPct>100))throw new Error('Best pet % must be 0–100.');}
      change.supportsVariants=field('supportsVariants').checked;const previous=values(current);change.prices={};for(const input of $('#price-inputs').querySelectorAll('input')){const value=input.value.trim(),normalized=normalizePrice(value);change.prices[input.dataset.variant]=!editingNew&&normalizePrice(previous[input.dataset.variant]).key===normalized.key?previous[input.dataset.variant]??null:normalized.key==='unpriced'?null:normalized.key==='oc'?'O/C':value;}
      if(Object.values(images).some(record=>!record.ready||record.expires<Date.now()))throw new Error('Upload the PNG again before saving.');if(Object.keys(images).length)change.artwork=Object.fromEntries(Object.entries(images).map(([variant,record])=>[variant,record.id]));if(Object.keys(assetPaths).length)change.assetPaths={...assetPaths};
      if(!metadata.image&&!images.normal&&!assetPaths.normal){editorTab('artwork');throw new Error('Choose a PNG or an existing asset.');}
      const count=[...drafts.entries()].filter(([other])=>other!==key(id)).reduce((sum,[,draft])=>sum+Object.keys(draft.artwork||{}).length,0)+Object.keys(change.artwork||{}).length;if(count>6)throw new Error('Publish at most six PNG uploads at a time.');
    }
    if(!editingNew){for(const name of Object.keys(metadata)){const previous=name==='image'?current?.image||current?.variantImages?.normal||'':name==='bestPct'?current?.bestPct??null:current?.[name]??'';if(metadata[name]===previous)delete metadata[name];}
      const priceChanged=category!=='codes'&&Object.entries(change.prices).some(([variant,value])=>normalizePrice(values(current)[variant]).key!==normalizePrice(value).key),pathsChanged=Object.entries(change.assetPaths||{}).some(([variant,path])=>path!==(variant==='normal'?current?.image||current?.variantImages?.normal:current?.variantImages?.[variant]));
      if(!Object.keys(metadata).length&&!priceChanged&&!pathsChanged&&!Object.keys(change.artwork||{}).length){discardDraft(id);dialog.close();notice('This card already matches the published catalog.');return;}
    }
    if(!drafts.has(key(id))&&drafts.size>=20)throw new Error('Publish at most 20 changes at a time.');if(editingNew&&selected.id&&selected.id!==id)discardDraft(selected.id);
    drafts.set(key(id),change);previews.set(key(id),{...images});markBaseline(id);saveDraft();renderReview();renderCatalog();dialog.close();notice(field('name').value+' saved to review.');
  }catch(error){notice(/feed|numeric price/i.test(error.message)?'Use a number, 25K, O/C or Not Price.':error.message,true);}
});
for(const selector of ['#publish','#dock-publish'])$(selector).addEventListener('click',publish);
for(const selector of ['#review-jump','#dock-review'])$(selector).addEventListener('click',event=>{event.preventDefault();openReview();});
$('#more-history').addEventListener('click',()=>{historyLimit+=5;renderActivity();});$('#check-publication').addEventListener('click',()=>{publicationTries=0;checkPublication();});
$('#gallery-search').addEventListener('input',()=>{galleryLimit=80;renderGallery();});$('#gallery-category').addEventListener('change',()=>{galleryLimit=80;renderGallery();});
$('#discord-test').addEventListener('click',async event=>{event.target.disabled=true;try{const result=await api('discord-test',{});notice(result.sent?'Discord confirmed delivery.':'Discord test queued for retry.',!result.sent);await activity();}catch(error){notice(error.message,true);}finally{event.target.disabled=false;}});
window.addEventListener('beforeunload',event=>{if(auth&&drafts.size&&!writeDraft(storage(),auth.username,{head:submitted?.head||snapshot?.head,changes:[...drafts.values()],base:Object.fromEntries(bases),previews:Object.fromEntries(previews),submitted})){event.preventDefault();event.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&auth){if(latestPublication)checkPublication();activity().catch(()=>{});}});
try{await start(await api('session'));}catch(error){if(!auth)showLogin();if(error.status!==401){if(auth)notice(error.message,true);else $('#login-message').textContent=error.message;}}
setInterval(()=>{if(auth&&!publishing&&!document.hidden)activity().catch(()=>{});if(snapshot&&auth)updateSummary();},30000);

import {prepareArtwork} from './artwork.js';
import {loadImage} from './image-loader.js';
import {categories,catalogKeys,rarityColors,priceLabel as label,changeKind,reviewStats,catalogEntries} from './catalog-state.js';
const $=selector=>document.querySelector(selector);
const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!=null)element.textContent=text;if(className)element.className=className;return element;};
const dialog=$('#editor-dialog'),form=$('#entry-form'),field=name=>form.elements.namedItem(name);
let auth=null,snapshot=null,category='pets',selected=null,editingNew=false,images={},operation=null,publishing=false,renderFrame=0;
const drafts=new Map(),previews=new Map();
const key=(id,cat=category)=>cat+'/'+id;
const entries=(cat=category)=>snapshot?.catalog[catalogKeys[cat]]||[];
const variants=item=>item.supportsVariants?['normal','golden','diamond']:['normal'];
const values=(item,cat=category)=>item.supportsVariants?{...snapshot.prices[cat]?.[item.id]}:{normal:snapshot.prices[cat]?.[item.id]};
function notice(text,error=false){for(const selector of ['#message','#editor-message']){const element=$(selector);element.textContent=text;element.classList.toggle('error',error);element.hidden=!text;}}
function showLogin(){if(dialog.open)dialog.close();auth=null;$('#workspace').hidden=true;$('#login-view').hidden=false;}
async function api(path,body){
  let response;try{response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'content-type':'application/json',...(auth?{'x-csrf-token':auth.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});}catch{throw new Error('Connection interrupted. If you were publishing, retry the same publish to check its result.');}
  let data;try{data=await response.json();}catch{throw new Error(`Server returned HTTP ${response.status}. Refresh and try again.`);}
  if(!response.ok){if(response.status===401 && path!=='login')showLogin();const error=new Error(data.error||'Request failed.');error.status=response.status;throw error;}
  return data;
}
async function start(session){auth=session;$('#account-name').textContent=auth.username;$('#login-view').hidden=true;$('#workspace').hidden=false;await reload();}
function updateSummary(){
  const stats=reviewStats(drafts),total=Object.values(catalogKeys).reduce((sum,name)=>sum+snapshot.catalog[name].length,0);
  $('#entry-count').textContent=total;$('#stat-total').textContent=total;$('#stat-pending').textContent=stats.total;$('#stat-removals').textContent=stats.delete;
  $('#stat-pending-label').textContent=stats.total?'Ready for your review':'Everything is up to date';
  $('#review-jump').textContent=stats.total?`Review ${stats.total} change${stats.total===1?'':'s'}`:'Review changes';
  $('#head-link').textContent='Synced · '+snapshot.head.slice(0,7);$('#head-link').href='https://github.com/Zerqoon/Pet-Sim-test/commit/'+snapshot.head;$('#head-link').hidden=false;
}
function renderCatalog(){
  if(!snapshot)return;
  $('#tabs').replaceChildren();
  for(const [name,title] of Object.entries(categories)){
    const button=node('button');button.type='button';button.setAttribute('aria-pressed',String(name===category));button.disabled=publishing;
    const count=entries(name).length+[...drafts.values()].filter(change=>change.category===name && change.add).length;
    button.append(node('span',title),node('span',count,'tab-count'));
    button.addEventListener('click',()=>{category=name;selected=null;renderCatalog();});$('#tabs').append(button);
  }
  $('#item-filter').hidden=category!=='items';$('#rarity-filter').hidden=category==='codes';$('#search').placeholder='Search '+categories[category].toLowerCase()+'…';
  const filters={term:$('#search').value,group:$('#item-filter').value,rarity:$('#rarity-filter').value,sort:$('#sort').value};
  const rows=catalogEntries(snapshot,drafts,category,filters),list=$('#catalog-list');list.replaceChildren();list.setAttribute('aria-busy',String(publishing));
  $('#result-count').textContent=`${rows.length} ${rows.length===1?'card':'cards'} · ${categories[category]}`;
  $('#reset-filters').hidden=!filters.term && (category!=='items'||filters.group==='all') && (category==='codes'||filters.rarity==='all') && filters.sort==='catalog';
  for(const {original,item,draft} of rows){
    const kind=draft?changeKind(draft):null,button=node('button',null,'entry'+(kind==='delete'?' deleting':'')+(selected?.id===item.id?' selected':''));button.type='button';button.disabled=publishing;
    button.style.setProperty('--rarity',rarityColors[item.rarity]||'#65d8ff');button.setAttribute('aria-label',item.name+(kind==='delete'?', queued for removal':', edit card'));
    if(category!=='codes'){
      const artwork=node('span',null,'entry-art'),img=node('img'),missing=node('span','Image unavailable','image-missing');
      img.alt='';img.loading='lazy';img.decoding='async';missing.hidden=true;artwork.append(img,missing);button.append(artwork);
      loadImage(img,{path:item.image||item.variantImages?.normal,ref:snapshot.head,site:auth?.site,preview:previews.get(key(item.id))?.normal?.preview},()=>{missing.hidden=false;});
    }else button.append(node('span','⌘','code-art'));
    const description=node('span',null,'entry-text');description.append(node('strong',item.name),node('small',category==='codes'?item.status:item.rarity));button.append(description);
    if(category!=='codes')button.append(node('span',label(draft?.prices && Object.hasOwn(draft.prices,'normal')?draft.prices.normal:values(original).normal),'value'));
    else button.append(node('span',item.code,'code-value'));
    button.append(node('span',kind==='delete'?'Queued for removal':kind==='add'?'New card · in review':draft?'Edited · in review':'Click to edit','card-action'));
    if(draft)button.append(node('span',kind==='delete'?'Removal':kind==='add'?'New':'Edited','card-status '+kind));
    button.addEventListener('click',()=>openEntry(original,!!draft?.add));list.append(button);
  }
  if(!rows.length){const empty=node('div',null,'empty-state');empty.append(node('span','⌕','empty-icon'),node('h3','No cards found'),node('p','Try a different name or reset your filters.'));list.append(empty);}
  updateSummary();
}
function scheduleCatalog(){if(!renderFrame)renderFrame=requestAnimationFrame(()=>{renderFrame=0;renderCatalog();});}
function updateEditorActions(){const removal=drafts.get(key(selected?.id))?.action==='delete';$('#save-entry').disabled=publishing||removal||Object.values(images).some(record=>!record.ready);}
function buildVariants(item){
  const keys=variants(item);for(const variant of Object.keys(images))if(!keys.includes(variant))delete images[variant];
  const prices=$('#price-inputs'),art=$('#artwork-inputs'),saved={};for(const input of prices.querySelectorAll('input'))saved[input.dataset.variant]=input.value;
  prices.replaceChildren();art.replaceChildren();prices.classList.toggle('single',keys.length===1);art.classList.toggle('single',keys.length===1);
  const draft=drafts.get(key(item.id)),initial=draft?.prices||(editingNew?{}:values(item));
  for(const variant of keys){
    const title=variant[0].toUpperCase()+variant.slice(1),priceLabel=node('label',title),input=node('input');input.dataset.variant=variant;input.value=saved[variant]??label(initial[variant]);input.maxLength=40;input.placeholder='Not Price';priceLabel.append(input);prices.append(priceLabel);
    const artworkLabel=node('label',null,'artwork-tile'),img=node('img',null,'art-preview'),missing=node('span','Preview unavailable','image-missing'),status=node('span',images[variant]?.ready?'New artwork ready':'PNG artwork','artwork-status');
    img.alt=title+' artwork';missing.hidden=true;const path=variant==='normal'?item.image||item.variantImages?.normal:item.variantImages?.[variant];
    const restore=()=>{missing.hidden=true;loadImage(img,{path,ref:snapshot?.head,site:auth?.site,preview:images[variant]?.preview},()=>{missing.hidden=!path;});};restore();
    const frame=node('span',null,'artwork-frame');frame.append(img,missing);artworkLabel.append(node('span',title,'artwork-title'),frame,status);
    const upload=node('input');upload.type='file';upload.accept='image/png';upload.setAttribute('aria-label',title+' PNG');
    upload.addEventListener('change',async()=>{
      const bucket=images,file=upload.files[0],previous=bucket[variant];if(!file)return;
      const record={id:crypto.randomUUID(),ready:false};bucket[variant]=record;upload.disabled=true;status.textContent='Preparing artwork…';updateEditorActions();
      try{
        const prepared=await prepareArtwork(file);record.preview=prepared.preview;missing.hidden=true;loadImage(img,{preview:prepared.preview});status.textContent='Uploading artwork…';
        await api('artwork',{id:record.id,content:prepared.content});record.ready=true;status.textContent=`Ready · ${prepared.width} × ${prepared.height}`;status.classList.add('ready');
        if(images===bucket)notice(title+' artwork ready. Save the card to review, then publish.');
      }catch(error){if(previous)bucket[variant]=previous;else delete bucket[variant];upload.value='';status.textContent='Upload failed · try again';status.classList.remove('ready');if(images===bucket){restore();notice(error.message,true);}}
      finally{upload.disabled=false;if(images===bucket)updateEditorActions();}
    });
    artworkLabel.append(upload);art.append(artworkLabel);
  }
  updateEditorActions();
}
function openEntry(original,isNew){
  if(publishing)return;
  selected=original;editingNew=isNew;const draft=drafts.get(key(original.id)),item={...original,...draft?.metadata},removal=draft?.action==='delete';images={...previews.get(key(original.id))};item.image||=item.variantImages?.normal||'';
  $('#editor-message').hidden=true;form.reset();form.hidden=false;$('#editor-empty').hidden=true;$('#editor-title').textContent=isNew?'Add a new card':item.name;$('#entry-badge').textContent=isNew?'NEW '+categories[category].toUpperCase():categories[category].toUpperCase()+' / '+(removal?'QUEUED FOR REMOVAL':'EDIT CARD');
  for(const name of ['name','id','rarity','source','description','image','bestPct','itemGroup','code','status'])field(name).value=item[name]??(name==='rarity'?'Exclusive':name==='status'?'active':name==='itemGroup'?'general':'');
  field('id').disabled=!isNew;field('supportsVariants').checked=!!(item.supportsVariants||draft?.supportsVariants);
  const codes=category==='codes';$('#code-fields').hidden=!codes;$('#metadata-row').hidden=codes;$('#group-label').hidden=category!=='items';$('#best-label').hidden=category!=='pets';$('#values-fields').hidden=codes;$('#artwork-fields').hidden=codes;$('#variants-toggle').hidden=category!=='pets'||!isNew;
  $('#new-category-label').hidden=!isNew;$('#new-category').value=category;$('#price-inputs').replaceChildren();$('#editor-details').disabled=removal;
  $('#remove-draft').hidden=!draft||removal;$('#delete-entry').hidden=isNew||removal;$('#delete-confirm').hidden=!removal;$('#confirm-delete').hidden=removal;$('#cancel-delete').hidden=removal;$('#undo-delete').hidden=!removal;
  $('#delete-title').textContent=removal?'This card is queued for removal':'Remove this card?';
  $('#delete-description').textContent=removal?'It stays on your website until you publish. Undo the removal to continue editing.':item.supportsVariants?'The card and its Normal, Golden and Diamond prices will be removed together. You can undo this in review before publishing.':codes?'This reward code will be removed from the catalog when you publish.':'The card and its price will be removed when you publish. You can undo this in review.';
  buildVariants({...item,supportsVariants:field('supportsVariants').checked});renderCatalog();
  if(!dialog.open){dialog.showModal();document.body.classList.add('modal-open');}dialog.scrollTop=0;
}
function discardDraft(id,cat=category){drafts.delete(key(id,cat));previews.delete(key(id,cat));operation=null;renderReview();renderCatalog();}
function renderReview(){
  if(!snapshot)return;
  const list=$('#review-list'),stats=reviewStats(drafts);list.replaceChildren();$('#draft-count').textContent=stats.total;
  const parts=[[stats.add,'new'],[stats.update,'edited'],[stats.delete,'removal'+(stats.delete===1?'':'s')]].filter(([count])=>count).map(([count,description])=>`${count} ${description}`);
  $('#review-summary').textContent=parts.join(' · ')||'No pending changes';$('#publish').disabled=!stats.total||publishing;$('#publish').textContent=publishing?'Publishing…':stats.total?`Publish ${stats.total} change${stats.total===1?'':'s'} ↗`:'Publish changes ↗';
  $('#clear-review').disabled=!stats.total||publishing;for(const selector of ['#add','#reload','#logout'])$(selector).disabled=publishing;
  for(const button of document.querySelectorAll('#catalog-list button,#tabs button'))button.disabled=publishing;
  document.body.classList.toggle('is-publishing',publishing);$('#catalog-list').setAttribute('aria-busy',String(publishing));
  for(const [id,draft] of drafts){
    const kind=changeKind(draft),before=entries(draft.category).find(item=>item.id===draft.id),name=draft.metadata?.name||before?.name||draft.id;
    const row=node('div',null,'review-item '+kind),symbol=node('span',kind==='delete'?'−':kind==='add'?'+':'↗','review-symbol'),text=node('div',null,'review-content');
    text.append(node('span',kind==='delete'?'REMOVE':kind==='add'?'ADD':'UPDATE','change-tag '+kind),node('strong',name),node('small',categories[draft.category]));
    if(kind==='delete')text.append(node('p',before?.supportsVariants?'Card and all three variant prices will be removed.':draft.category==='codes'?'Code will be removed from the catalog.':'Card and its price will be removed.','hint'));
    else if(draft.prices){const old=before?values(before,draft.category):{};text.append(node('p',Object.entries(draft.prices).map(([variant,value])=>`${variant==='normal'?'Value':variant[0].toUpperCase()+variant.slice(1)}: ${label(old[variant])} → ${label(value)}`).join(' · '),'hint'));}
    const undo=node('button',kind==='delete'?'Undo removal':'Discard','subtle');undo.type='button';undo.disabled=publishing;undo.setAttribute('aria-label',(kind==='delete'?'Undo removal of ':'Discard changes to ')+name);undo.addEventListener('click',()=>discardDraft(draft.id,draft.category));row.append(symbol,text,undo);list.append(row);
  }
  if(!stats.total){const empty=node('div',null,'review-empty');empty.append(node('span','✓','review-empty-icon'),node('div','Your workspace is clear.'),node('small','Edits, additions and removals appear here before publication.'));list.append(empty);}
  updateSummary();
}
async function activity(){
  const result=await api('activity'),list=$('#activity-list');list.replaceChildren();
  for(const entry of result.entries){
    const row=node('div',null,'activity-item'),avatar=node('span',entry.username.slice(0,1),'activity-avatar'),content=node('div',null,'activity-content'),link=node('a',entry.username+' · '+new Date(entry.created).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}));
    link.href='https://github.com/Zerqoon/Pet-Sim-test/commit/'+entry.sha;link.target='_blank';link.rel='noopener noreferrer';content.append(link,node('span',JSON.parse(entry.summary).join(' · ')));
    row.append(avatar,content,node('span',entry.sent?'Discord delivered':entry.status&&entry.status>=400?'Retry queued':'Discord queued','delivery-status'+(entry.sent?' delivered':'')));list.append(row);
  }
  if(!result.entries.length)list.append(node('p','No publications yet. Your updates will appear here.','empty'));
}
async function reload(){
  $('#catalog-list').setAttribute('aria-busy','true');
  try{snapshot=await api('catalog');selected=null;form.hidden=true;$('#editor-empty').hidden=false;renderCatalog();renderReview();try{await activity();}catch{$('#activity-list').replaceChildren(node('p','Publication history is temporarily unavailable.','empty'));}}
  finally{$('#catalog-list').setAttribute('aria-busy',String(publishing));}
}
function addEntry(){openEntry({id:'',name:'',rarity:'Exclusive',source:'',description:'',image:'',status:'active'},true);}
$('#login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;$('#login-message').textContent='Signing in…';try{const data=new FormData(event.target);await start(await api('login',{username:data.get('username'),password:data.get('password')}));event.target.reset();$('#login-message').textContent='';}catch(error){$('#login-message').textContent=error.message;}finally{button.disabled=false;}});
$('#logout').addEventListener('click',async()=>{if(drafts.size&&!confirm('Discard your pending changes and sign out?'))return;try{await api('logout',{});drafts.clear();previews.clear();operation=null;showLogin();}catch(error){notice(error.message,true);}});
$('#reload').addEventListener('click',async()=>{if(drafts.size&&!confirm('Refresh the catalog and discard pending changes?'))return;drafts.clear();previews.clear();operation=null;try{await reload();notice('Latest catalog loaded.');}catch(error){notice(error.message,true);}});
$('#search').addEventListener('input',scheduleCatalog);for(const selector of ['#item-filter','#rarity-filter','#sort'])$(selector).addEventListener('change',renderCatalog);
$('#reset-filters').addEventListener('click',()=>{$('#search').value='';$('#item-filter').value='all';$('#rarity-filter').value='all';$('#sort').value='catalog';renderCatalog();});
$('#add').addEventListener('click',addEntry);
$('#new-category').addEventListener('change',event=>{if(Object.values(images).some(record=>!record.ready)){event.target.value=category;notice('Wait for artwork to finish uploading.',true);return;}if(confirm('Switch category and clear this new card form?')){category=event.target.value;addEntry();}else event.target.value=category;});
$('#close-editor').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
field('name').addEventListener('input',()=>{if(editingNew)field('id').value=field('name').value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);});
field('supportsVariants').addEventListener('change',()=>buildVariants({...selected,supportsVariants:field('supportsVariants').checked}));
$('#remove-draft').addEventListener('click',()=>{const original=entries().find(item=>item.id===selected.id);discardDraft(selected.id);if(original)openEntry(original,false);else dialog.close();});
$('#delete-entry').addEventListener('click',()=>{if(Object.values(images).some(record=>!record.ready)){notice('Wait for artwork to finish uploading.',true);return;}$('#delete-confirm').hidden=false;$('#delete-confirm').scrollIntoView({block:'nearest'});$('#confirm-delete').focus();});
$('#cancel-delete').addEventListener('click',()=>{$('#delete-confirm').hidden=true;});
$('#confirm-delete').addEventListener('click',()=>{if(publishing||editingNew||!selected)return;if(Object.values(images).some(record=>!record.ready)){notice('Wait for artwork to finish uploading.',true);return;}if(!drafts.has(key(selected.id))&&drafts.size>=20){notice('Publish at most 20 changes at a time.',true);return;}const name=selected.name;drafts.set(key(selected.id),{category,id:selected.id,action:'delete'});previews.delete(key(selected.id));operation=null;dialog.close();renderReview();renderCatalog();notice(name+' queued for removal. Undo it in review or publish when ready.');});
$('#undo-delete').addEventListener('click',()=>{const original=entries().find(item=>item.id===selected.id);discardDraft(selected.id);openEntry(original,false);});
$('#clear-review').addEventListener('click',()=>{if(!confirm('Discard all pending edits and removals?'))return;drafts.clear();previews.clear();operation=null;renderReview();renderCatalog();notice('Review cleared. No changes were published.');});
form.addEventListener('submit',event=>{
  event.preventDefault();if(publishing)return;
  try{
    if(drafts.get(key(selected.id))?.action==='delete')throw new Error('Undo this removal before editing the card.');
    const id=field('id').value.trim(),metadata={name:field('name').value.trim(),source:field('source').value.trim(),description:field('description').value.trim()};
    if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id))throw new Error('Use a lowercase identifier with letters, numbers and hyphens.');
    if(editingNew&&entries().some(item=>item.id===id))throw new Error('This identifier already exists.');
    if(editingNew&&id!==selected.id&&drafts.has(key(id)))throw new Error('Another pending card already uses this identifier.');
    const change={category,id,add:editingNew,metadata};
    if(category==='codes'){metadata.code=field('code').value.trim();metadata.status=field('status').value;if(!metadata.code)throw new Error('Enter the reward code.');}
    else{
      metadata.rarity=field('rarity').value;metadata.image=field('image').value.trim();if(category==='items')metadata.itemGroup=field('itemGroup').value;if(category==='pets')metadata.bestPct=field('bestPct').value===''?null:Number(field('bestPct').value);
      change.supportsVariants=field('supportsVariants').checked;change.prices=Object.fromEntries([...$('#price-inputs').querySelectorAll('input')].map(input=>[input.dataset.variant,input.value.trim()]));
      if(Object.values(images).some(record=>!record.ready))throw new Error('Wait for artwork to finish uploading.');
      if(Object.keys(images).length)change.artwork=Object.fromEntries(Object.entries(images).map(([variant,record])=>[variant,record.id]));if(!metadata.image&&!images.normal)throw new Error('Add a PNG or an existing image path.');
    }
    if(!drafts.has(key(id))&&drafts.size>=20)throw new Error('Publish at most 20 changes at a time.');
    if(editingNew&&selected.id&&selected.id!==id){drafts.delete(key(selected.id));previews.delete(key(selected.id));}
    drafts.set(key(id),change);previews.set(key(id),{...images});operation=null;renderReview();renderCatalog();dialog.close();notice(metadata.name+' saved to review. Publish when ready.');
  }catch(error){notice(error.message,true);}
});
$('#publish').addEventListener('click',async()=>{
  if(publishing||!drafts.size)return;publishing=true;operation||=crypto.randomUUID();renderReview();
  try{
    const result=await api('publish',{id:operation,head:snapshot.head,changes:[...drafts.values()]});drafts.clear();previews.clear();operation=null;
    const success=`Saved to GitHub (${result.sha.slice(0,7)}). Your website updates after deployment.`;
    try{await reload();notice(success);}catch(error){notice(success+' Refresh the catalog to load the saved changes. '+error.message,true);}
  }catch(error){notice(error.message+(error.status===409?' Use Refresh to load the new version.':''),true);}
  finally{publishing=false;renderReview();}
});
$('#discord-test').addEventListener('click',async event=>{event.target.disabled=true;try{const result=await api('discord-test',{});notice(result.sent?'Discord confirmed delivery.':`Discord test queued for retry${result.status?' (HTTP '+result.status+')':''}.`,!result.sent);await activity();}catch(error){notice(error.message,true);}finally{event.target.disabled=false;}});
window.addEventListener('beforeunload',event=>{if(drafts.size){event.preventDefault();event.returnValue='';}});
try{const session=await api('session');try{await start(session);}catch(error){notice(error.message,true);}}catch(error){showLogin();if(error.status!==401)$('#login-message').textContent=error.message;}
setInterval(()=>{if(auth&&!publishing)activity().catch(()=>{});},30000);

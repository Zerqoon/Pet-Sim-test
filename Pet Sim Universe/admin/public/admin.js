import {prepareArtwork} from './artwork.js';
const $=selector=>document.querySelector(selector);
const categories={pets:'Pets',charms:'Charms',eggs:'Eggs',items:'Items',codes:'Codes'}, exports={pets:'PETS',charms:'CHARMS',eggs:'EGGS',items:'ITEMS',codes:'CODES'};
let auth=null,snapshot=null,category='pets',selected=null,editingNew=false,drafts=new Map(),previews=new Map(),images={},operation=null,publishing=false;
const node=(tag,text,className)=> {const el=document.createElement(tag); if(text!=null) el.textContent=text; if(className) el.className=className; return el;};
const dialog=$('#editor-dialog');
const form=$('#entry-form'), field=name=>form.elements.namedItem(name);
const escapePath=p=>p.split('/').map(encodeURIComponent).join('/');
const imageURL=path=> /^assets\/[\w./-]+\.png$/.test(path||'')?'https://petuniverse-values.pl/'+escapePath(path):'';
function notice(text,error=false) {$('#message').textContent=text;$('#message').classList.toggle('error',error);$('#message').hidden=!text;$('#editor-message').textContent=text;$('#editor-message').classList.toggle('error',error);$('#editor-message').hidden=!text;}
async function api(path,body) {
  let response;try {response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'content-type':'application/json',...(auth?{'x-csrf-token':auth.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});} catch {throw new Error('Connection interrupted. If you were publishing, retry the same publish to check its result.');}
  let data;try{data=await response.json();}catch{throw new Error(`Server returned HTTP ${response.status}. Refresh and try again.`);}
  if(!response.ok) {if(response.status===401 && path!=='login') showLogin();const error=new Error(data.error||'Request failed.');error.status=response.status;throw error;}
  return data;
}
function showLogin() {if(dialog.open)dialog.close();auth=null;$('#workspace').hidden=true;$('#login-view').hidden=false;}
async function start(session) {auth=session;$('#account-name').textContent=auth.username;$('#login-view').hidden=true;$('#workspace').hidden=false;await reload();}
function entries() {return snapshot?.catalog[exports[category]]||[];}
function variants(item) {return item.supportsVariants?['normal','golden','diamond']:['normal'];}
function values(item,cat=category) {const price=snapshot.prices[cat]?.[item.id];return item.supportsVariants?{...price}:{normal:price};}
const label=v=>v===null || v===undefined || /^(?:\?\?\?|null|not price|no price|n\/a|unknown)?$/i.test(String(v).trim())?'Not Price':String(v);
function renderCatalog() {
  $('#tabs').replaceChildren();for(const [key,title] of Object.entries(categories)) {const b=node('button',title);b.type='button';b.setAttribute('aria-pressed',String(key===category));b.addEventListener('click',()=>{category=key;selected=null;form.hidden=true;$('#editor-empty').hidden=false;$('#editor-title').textContent='Select an entry';renderCatalog();});$('#tabs').append(b);}
  $('#item-filter').hidden=category!=='items';
  const list=$('#catalog-list');list.replaceChildren();const term=$('#search').value.toLowerCase();
  const listed=entries().concat([...drafts.values()].filter(x=>x.category===category&&x.add).map(x=>({...x.metadata,id:x.id,supportsVariants:x.supportsVariants})));
  for(const original of listed) {
    const draft=drafts.get(category+'/'+original.id),item={...original,...draft?.metadata};
    if(![item.name,item.id,item.source||''].join(' ').toLowerCase().includes(term)) continue;
    if(category==='items' && $('#item-filter').value!=='all' && (item.itemGroup||'general')!==$('#item-filter').value)continue;
    const button=node('button',null,'entry'+(selected?.id===item.id?' selected':''));button.type='button';button.style.setProperty('--rarity',({Exclusive:'#a66bff',Secret:'#d8dde8',Mythical:'#ff4e9a',Legendary:'#ffd33f',Epic:'#34d8ff',Rare:'#7ef23a',Basic:'#8f98a8'})[item.rarity]||'#65d8ff');
    if(item.image || previews.get(category+'/'+item.id)?.normal?.preview) {const img=node('img');img.src=previews.get(category+'/'+item.id)?.normal?.preview||imageURL(item.image);img.alt='';img.loading='lazy';img.addEventListener('error',()=>{img.hidden=true;});button.append(img);}
    const desc=node('span',null,'entry-text');desc.append(node('strong',item.name),node('small',category==='codes'?item.status:item.rarity));button.append(desc);
    if(category!=='codes') button.append(node('span',label(draft?.prices && Object.hasOwn(draft.prices,'normal')?draft.prices.normal:values(original).normal),'value'));
    button.append(node('span',draft?'Pending update':'Click to edit','card-action'));
    if(draft) {const dot=node('span',null,'pending');dot.title='Pending change';button.append(dot);}
    button.addEventListener('click',()=>openEntry(original,!!draft?.add));list.append(button);
  }
  if(!list.childElementCount) list.append(node('p','No entries found.','empty'));
  $('#entry-count').textContent=Object.values(exports).reduce((sum,key)=>sum+snapshot.catalog[key].length,0);
}
function buildVariants(item) {
  const variantKeys=variants(item); for(const key of Object.keys(images))if(!variantKeys.includes(key))delete images[key]; const prices=$('#price-inputs'),art=$('#artwork-inputs');
  const saved={};for(const input of prices.querySelectorAll('input')) saved[input.dataset.variant]=input.value;
  prices.replaceChildren();art.replaceChildren();prices.classList.toggle('single',variantKeys.length===1);art.classList.toggle('single',variantKeys.length===1);
  const draft=drafts.get(category+'/'+item.id),initial=draft?.prices|| (editingNew?{}:values(item));
  for(const variant of variantKeys) {
    const title=variant[0].toUpperCase()+variant.slice(1);const l=node('label',title),input=node('input');input.dataset.variant=variant;input.value=saved[variant]??label(initial[variant]);input.maxLength=40;input.placeholder='Not Price';l.append(input);prices.append(l);
    const labelEl=node('label',title);const img=node('img',null,'art-preview');img.alt=title+' artwork';
    const path=variant==='normal'?item.image:item.variantImages?.[variant];img.src=images[variant]?.preview || imageURL(path);img.hidden=!img.getAttribute('src');img.addEventListener('error',()=>{img.hidden=true;});labelEl.append(img);
    const upload=node('input');upload.type='file';upload.accept='image/png';upload.setAttribute('aria-label',title+' PNG');
    upload.addEventListener('change',async()=> {
      const bucket=images,id=crypto.randomUUID(),file=upload.files[0];if(!file)return;
      const record={id,ready:false};bucket[variant]=record;upload.disabled=true;
      try {
        const prepared=await prepareArtwork(file);record.preview=prepared.preview;img.src=prepared.preview;img.hidden=false;
        await api('artwork',{id,content:prepared.content});record.ready=true;
        notice(`${title} artwork ready (${prepared.width} × ${prepared.height}). Add the entry to review, then publish.`);
      } catch(error) {delete bucket[variant];upload.value='';notice(error.message,true);}
      finally {upload.disabled=false;}
    });
    labelEl.append(upload);art.append(labelEl);
  }
}
function openEntry(original,isNew) {
  $('#editor-message').hidden=true;editingNew=isNew;selected=original;const draft=drafts.get(category+'/'+original.id),item={...original,...draft?.metadata};images={...previews.get(category+'/'+original.id)};
  form.reset();form.hidden=false;$('#editor-empty').hidden=true;$('#editor-title').textContent=isNew?'Add '+categories[category].slice(0,-1):item.name;$('#entry-badge').textContent=isNew?'NEW ENTRY':'EDIT ENTRY';
  for(const key of ['name','id','rarity','source','description','image','bestPct','itemGroup','code','status']) field(key).value=item[key]??(key==='rarity'?'Exclusive':key==='status'?'active':key==='itemGroup'?'general':'');
  field('id').disabled=!isNew;field('supportsVariants').checked=!!(item.supportsVariants||draft?.supportsVariants);
  const codes=category==='codes';$('#code-fields').hidden=!codes;$('#metadata-row').hidden=codes;$('#group-label').hidden=category!=='items';$('#best-label').hidden=category!=='pets';$('#values-fields').hidden=codes;$('#artwork-fields').hidden=codes;$('#variants-toggle').hidden=category!=='pets'||!isNew;
  $('#price-inputs').replaceChildren();buildVariants({...item,supportsVariants:field('supportsVariants').checked});$('#remove-draft').hidden=!draft;renderCatalog();
  $('#new-category-label').hidden=!isNew;$('#new-category').value=category;
  if(!dialog.open){dialog.showModal();document.body.classList.add('modal-open');}
}
function renderReview() {
  const list=$('#review-list');list.replaceChildren();$('#draft-count').textContent=drafts.size;$('#publish').disabled=!drafts.size||publishing;
  for(const [key,draft] of drafts) {
    const row=node('div',null,'review-item'),text=node('div');text.append(node('strong',(draft.add?'Add ':'Update ')+draft.metadata.name),node('small',' · '+categories[draft.category]));
    if(draft.prices) {const before=snapshot.catalog[exports[draft.category]].find(x=>x.id===draft.id),old=before?values(before,draft.category):{};text.append(node('p',Object.entries(draft.prices).map(([variant,v])=>`${variant==='normal'?'Value':variant}: ${label(old[variant])} → ${label(v)}`).join(' · '),'hint'));}
    const remove=node('button','Remove','subtle');remove.type='button';remove.addEventListener('click',()=>{drafts.delete(key);previews.delete(key);operation=null;renderReview();renderCatalog();});row.append(text,remove);list.append(row);
  }
  if(!drafts.size) list.append(node('p','Your changes will appear here before they go live.','muted'));
}
async function activity() {
  const result=await api('activity');const list=$('#activity-list');list.replaceChildren();
  for(const entry of result.entries) {
    const row=node('div',null,'activity-item'),content=node('div'),link=node('a',`${entry.username} · ${new Date(entry.created).toLocaleString('en-GB')}`);link.href='https://github.com/Zerqoon/Pet-Sim-test/commit/'+entry.sha;link.target='_blank';link.rel='noopener noreferrer';
    content.append(link,node('span',JSON.parse(entry.summary).join(' · ')));row.append(content,node('span',entry.sent?'Discord delivered':entry.status && entry.status>=400?`Discord retry queued (${entry.status})`:'Discord queued'));list.append(row);
  }
  if(!result.entries.length) list.append(node('p','No admin updates yet.','muted'));
}
async function reload() {snapshot=await api('catalog');selected=null;form.hidden=true;$('#editor-empty').hidden=false;renderCatalog();renderReview();await activity();}
$('#login-form').addEventListener('submit',async e=> {e.preventDefault();const b=e.submitter;b.disabled=true;$('#login-message').textContent='Signing in…';try {const data=new FormData(e.target);await start(await api('login',{username:data.get('username'),password:data.get('password')}));e.target.reset();$('#login-message').textContent='';}catch(e){$('#login-message').textContent=e.message;}finally{b.disabled=false;}});
$('#logout').addEventListener('click',async()=> {if(drafts.size&&!confirm('Discard your pending changes and sign out?'))return;try{await api('logout',{});drafts.clear();previews.clear();showLogin();}catch(e){notice(e.message,true);}});
$('#reload').addEventListener('click',async()=> {if(drafts.size&&!confirm('Refresh the catalog and discard pending changes?'))return;drafts.clear();previews.clear();operation=null;try{await reload();notice('Latest catalog loaded.');}catch(e){notice(e.message,true);}});
$('#search').addEventListener('input',renderCatalog);
function addEntry(){openEntry({id:'',name:'',rarity:'Exclusive',source:'',description:'',image:'',status:'active'},true);}
$('#add').addEventListener('click',addEntry);
$('#item-filter').addEventListener('change',renderCatalog);
$('#new-category').addEventListener('change',e=>{if(Object.values(images).some(x=>!x.ready)){e.target.value=category;notice('Wait for artwork to finish uploading.',true);return;}if(confirm('Switch category and clear this new entry form?')){category=e.target.value;addEntry();}else e.target.value=category;});
$('#close-editor').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
field('name').addEventListener('input',()=> {if(editingNew)field('id').value=field('name').value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);});
field('supportsVariants').addEventListener('change',()=>buildVariants({...selected,supportsVariants:field('supportsVariants').checked}));
$('#remove-draft').addEventListener('click',()=>{drafts.delete(category+'/'+selected.id);previews.delete(category+'/'+selected.id);operation=null;renderReview();renderCatalog();$('#remove-draft').hidden=true;});
form.addEventListener('submit',e=> {e.preventDefault();try{
  const id=field('id').value.trim(),metadata={name:field('name').value.trim(),source:field('source').value.trim(),description:field('description').value.trim()};
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) throw new Error('Use a lowercase identifier with letters, numbers and hyphens.');
  if(editingNew&&entries().some(x=>x.id===id))throw new Error('This identifier already exists.');
  if(editingNew&&id!==selected.id&&drafts.has(category+'/'+id))throw new Error('Another pending entry already uses this identifier.');
  const change={category,id,add:editingNew,metadata};
  if(category==='codes'){metadata.code=field('code').value.trim();metadata.status=field('status').value;if(!metadata.code)throw new Error('Enter the reward code.');}
  else {
    metadata.rarity=field('rarity').value;metadata.image=field('image').value.trim();
    if(category==='items')metadata.itemGroup=field('itemGroup').value;
    if(category==='pets')metadata.bestPct=field('bestPct').value===''?null:Number(field('bestPct').value);
    change.supportsVariants=field('supportsVariants').checked;change.prices=Object.fromEntries([...$('#price-inputs').querySelectorAll('input')].map(x=>[x.dataset.variant,x.value.trim()]));
    if(Object.values(images).some(x=>!x.ready))throw new Error('Wait for the artwork upload to finish.');
    if(Object.keys(images).length)change.artwork=Object.fromEntries(Object.entries(images).map(([variant,data])=>[variant,data.id]));if(!metadata.image&&!images.normal)throw new Error('Add a PNG or an existing image path.');
  }
  if(!drafts.has(category+'/'+id)&&drafts.size>=20)throw new Error('Publish at most 20 changes at a time.');
  if(editingNew&&selected.id&&selected.id!==id){drafts.delete(category+'/'+selected.id);previews.delete(category+'/'+selected.id);}
  drafts.set(category+'/'+id,change);previews.set(category+'/'+id,{...images});selected={...selected,...metadata,id};operation=null;renderReview();renderCatalog();$('#remove-draft').hidden=false;dialog.close();notice(`${metadata.name} saved to review. Publish when ready.`);
}catch(e){notice(e.message,true);}});
$('#publish').addEventListener('click',async()=> {
  if(publishing||!drafts.size)return;
  publishing=true;operation ||= crypto.randomUUID();$('#publish').textContent='Publishing…';renderReview();
  try {const result=await api('publish',{id:operation,head:snapshot.head,changes:[...drafts.values()]});drafts.clear();previews.clear();operation=null;await reload();notice(`Saved to GitHub (${result.sha.slice(0,7)}). Website deployment is pending; new values become live after the build succeeds.`);}catch(e){notice(e.message+(e.status===409?' Use Refresh to load the new version.':''),true);}finally{publishing=false;$('#publish').textContent='Publish changes ↗';renderReview();}
});
$('#discord-test').addEventListener('click',async e=>{e.target.disabled=true;try{const result=await api('discord-test',{});notice(result.sent?'Discord confirmed delivery.':`Discord test queued for retry${result.status?' (HTTP '+result.status+')':''}.`,!result.sent);await activity();}catch(e){notice(e.message,true);}finally{e.target.disabled=false;}});
window.addEventListener('beforeunload',e=>{if(drafts.size){e.preventDefault();e.returnValue='';}});
try{const session=await api('session');try{await start(session);}catch(e){notice(e.message,true);}}catch(e){showLogin();if(e.status!==401)$('#login-message').textContent=e.message;}
setInterval(()=>{if(auth&&!publishing)activity().catch(()=>{});},30000);

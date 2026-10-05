const $=selector=>document.querySelector(selector);
const categories={pets:'Pets',charms:'Charms',eggs:'Eggs',items:'Items',codes:'Codes'}, exports={pets:'PETS',charms:'CHARMS',eggs:'EGGS',items:'ITEMS',codes:'CODES'};
let auth=null,snapshot=null,category='pets',selected=null,editingNew=false,drafts=new Map(),images={},operation=null,publishing=false;
const node=(tag,text,className)=> {const el=document.createElement(tag); if(text!=null) el.textContent=text; if(className) el.className=className; return el;};
const form=$('#entry-form'), field=name=>form.elements.namedItem(name);
const escapePath=p=>p.split('/').map(encodeURIComponent).join('/');
const imageURL=path=> /^assets\/[\w./-]+\.png$/.test(path||'')?'https://petuniverse-values.pl/'+escapePath(path):'';
function notice(text,error=false) {$('#message').textContent=text;$('#message').classList.toggle('error',error);$('#message').hidden=!text;}
async function api(path,body) {
  let response;try {response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'content-type':'application/json',...(auth?{'x-csrf-token':auth.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});} catch {throw new Error('Connection interrupted. If you were publishing, retry the same publish to check its result.');}
  const data=await response.json();
  if(!response.ok) {if(response.status===401 && path!=='login') showLogin();const error=new Error(data.error||'Request failed.');error.status=response.status;throw error;}
  return data;
}
function showLogin() {auth=null;$('#workspace').hidden=true;$('#login-view').hidden=false;}
async function start(session) {auth=session;$('#account-name').textContent=auth.username;$('#login-view').hidden=true;$('#workspace').hidden=false;await reload();}
function entries() {return snapshot?.catalog[exports[category]]||[];}
function variants(item) {return item.supportsVariants?['normal','golden','diamond']:['normal'];}
function values(item,cat=category) {const price=snapshot.prices[cat]?.[item.id];return item.supportsVariants?{...price}:{normal:price};}
const label=v=>v===null || v===undefined || /^(?:\?\?\?|null|not price|no price|n\/a|unknown)?$/i.test(String(v).trim())?'Not Price':String(v);
function renderCatalog() {
  $('#tabs').replaceChildren();for(const [key,title] of Object.entries(categories)) {const b=node('button',title);b.type='button';b.setAttribute('aria-pressed',String(key===category));b.addEventListener('click',()=>{category=key;selected=null;form.hidden=true;$('#editor-empty').hidden=false;$('#editor-title').textContent='Select an entry';renderCatalog();});$('#tabs').append(b);}
  const list=$('#catalog-list');list.replaceChildren();const term=$('#search').value.toLowerCase();
  const listed=entries().concat([...drafts.values()].filter(x=>x.category===category&&x.add).map(x=>({...x.metadata,id:x.id,supportsVariants:x.supportsVariants})));
  for(const original of listed) {
    const draft=drafts.get(category+'/'+original.id),item={...original,...draft?.metadata};
    if(![item.name,item.id,item.source||''].join(' ').toLowerCase().includes(term)) continue;
    const button=node('button',null,'entry'+(selected?.id===item.id?' selected':''));button.type='button';
    if(item.image) {const img=node('img');img.src=imageURL(item.image);img.alt='';img.loading='lazy';img.addEventListener('error',()=>{img.hidden=true;});button.append(img);}
    const desc=node('span',null,'entry-text');desc.append(node('strong',item.name),node('small',category==='codes'?item.status:item.rarity));button.append(desc);
    if(category!=='codes') button.append(node('span',label(draft?.prices && Object.hasOwn(draft.prices,'normal')?draft.prices.normal:values(original).normal),'value'));
    if(draft) {const dot=node('span',null,'pending');dot.title='Pending change';button.append(dot);}
    button.addEventListener('click',()=>openEntry(original,!!draft?.add));list.append(button);
  }
  if(!list.childElementCount) list.append(node('p','No entries found.','empty'));
  $('#entry-count').textContent=Object.values(exports).reduce((sum,key)=>sum+snapshot.catalog[key].length,0);
}
function buildVariants(item) {
  const variantKeys=variants(item); const prices=$('#price-inputs'),art=$('#artwork-inputs');
  const saved={};for(const input of prices.querySelectorAll('input')) saved[input.dataset.variant]=input.value;
  prices.replaceChildren();art.replaceChildren();prices.classList.toggle('single',variantKeys.length===1);art.classList.toggle('single',variantKeys.length===1);
  const draft=drafts.get(category+'/'+item.id),initial=draft?.prices|| (editingNew?{}:values(item));
  for(const variant of variantKeys) {
    const title=variant[0].toUpperCase()+variant.slice(1);const l=node('label',title),input=node('input');input.dataset.variant=variant;input.value=saved[variant]??label(initial[variant]);input.maxLength=40;input.placeholder='Not Price';l.append(input);prices.append(l);
    const labelEl=node('label',title);const img=node('img',null,'art-preview');img.alt=title+' artwork';
    const path=variant==='normal'?item.image:item.variantImages?.[variant];img.src=images[variant]?'data:image/png;base64,'+images[variant]:imageURL(path);img.hidden=!img.getAttribute('src');img.addEventListener('error',()=>{img.hidden=true;});labelEl.append(img);
    const upload=node('input');upload.type='file';upload.accept='image/png';upload.setAttribute('aria-label',title+' PNG');
    upload.addEventListener('change',async()=> {try {const file=upload.files[0];if(!file) return;if(file.type!=='image/png' || file.size>1048576) throw new Error('Choose a PNG smaller than 1 MB.');const imageBucket=images;const reader=new FileReader();reader.onload=()=>{imageBucket[variant]=String(reader.result).split(',')[1];img.src=String(reader.result);img.hidden=false;};reader.readAsDataURL(file);} catch(e){notice(e.message,true);upload.value='';}});
    labelEl.append(upload);art.append(labelEl);
  }
}
function openEntry(original,isNew) {
  editingNew=isNew;selected=original;const draft=drafts.get(category+'/'+original.id),item={...original,...draft?.metadata};images={...draft?.images};
  form.reset();form.hidden=false;$('#editor-empty').hidden=true;$('#editor-title').textContent=isNew?'Add '+categories[category].slice(0,-1):item.name;$('#entry-badge').textContent=isNew?'NEW ENTRY':'EDIT ENTRY';
  for(const key of ['name','id','rarity','source','description','image','bestPct','itemGroup','code','status']) field(key).value=item[key]??(key==='rarity'?'Exclusive':key==='status'?'active':key==='itemGroup'?'general':'');
  field('id').disabled=!isNew;field('supportsVariants').checked=!!(item.supportsVariants||draft?.supportsVariants);
  const codes=category==='codes';$('#code-fields').hidden=!codes;$('#metadata-row').hidden=codes;$('#group-label').hidden=category!=='items';$('#best-label').hidden=category!=='pets';$('#values-fields').hidden=codes;$('#artwork-fields').hidden=codes;$('#variants-toggle').hidden=category!=='pets'||!isNew;
  $('#price-inputs').replaceChildren();buildVariants({...item,supportsVariants:field('supportsVariants').checked});$('#remove-draft').hidden=!draft;renderCatalog();
  if(matchMedia('(max-width:900px)').matches) $('.detail').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderReview() {
  const list=$('#review-list');list.replaceChildren();$('#draft-count').textContent=drafts.size;$('#publish').disabled=!drafts.size||publishing;
  for(const [key,draft] of drafts) {
    const row=node('div',null,'review-item'),text=node('div');text.append(node('strong',(draft.add?'Add ':'Update ')+draft.metadata.name),node('small',' · '+categories[draft.category]));
    if(draft.prices) {const before=snapshot.catalog[exports[draft.category]].find(x=>x.id===draft.id),old=before?values(before,draft.category):{};text.append(node('p',Object.entries(draft.prices).map(([variant,v])=>`${variant==='normal'?'Value':variant}: ${label(old[variant])} → ${label(v)}`).join(' · '),'hint'));}
    const remove=node('button','Remove','subtle');remove.type='button';remove.addEventListener('click',()=>{drafts.delete(key);operation=null;renderReview();renderCatalog();});row.append(text,remove);list.append(row);
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
$('#logout').addEventListener('click',async()=> {if(drafts.size&&!confirm('Discard your pending changes and sign out?'))return;try{await api('logout',{});drafts.clear();showLogin();}catch(e){notice(e.message,true);}});
$('#reload').addEventListener('click',async()=> {if(drafts.size&&!confirm('Refresh the catalog and discard pending changes?'))return;drafts.clear();operation=null;try{await reload();notice('Latest catalog loaded.');}catch(e){notice(e.message,true);}});
$('#search').addEventListener('input',renderCatalog);
$('#add').addEventListener('click',()=>openEntry({id:'',name:'',rarity:'Exclusive',source:'',description:'',image:'',status:'active'},true));
field('name').addEventListener('input',()=> {if(editingNew)field('id').value=field('name').value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);});
field('supportsVariants').addEventListener('change',()=>buildVariants({...selected,supportsVariants:field('supportsVariants').checked}));
$('#remove-draft').addEventListener('click',()=>{drafts.delete(category+'/'+selected.id);operation=null;renderReview();renderCatalog();$('#remove-draft').hidden=true;});
form.addEventListener('submit',e=> {e.preventDefault();try{
  const id=field('id').value.trim(),metadata={name:field('name').value.trim(),source:field('source').value.trim(),description:field('description').value.trim()};
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) throw new Error('Use a lowercase identifier with letters, numbers and hyphens.');
  if(editingNew&&entries().some(x=>x.id===id))throw new Error('This identifier already exists.');
  const change={category,id,add:editingNew,metadata};
  if(category==='codes'){metadata.code=field('code').value.trim();metadata.status=field('status').value;if(!metadata.code)throw new Error('Enter the reward code.');}
  else {
    metadata.rarity=field('rarity').value;metadata.image=field('image').value.trim();
    if(category==='items')metadata.itemGroup=field('itemGroup').value;
    if(category==='pets')metadata.bestPct=field('bestPct').value===''?null:Number(field('bestPct').value);
    change.supportsVariants=field('supportsVariants').checked;change.prices=Object.fromEntries([...$('#price-inputs').querySelectorAll('input')].map(x=>[x.dataset.variant,x.value.trim()]));
    if(Object.keys(images).length)change.images={...images};if(!metadata.image&&!images.normal)throw new Error('Add a PNG or an existing image path.');
  }
  if(!drafts.has(category+'/'+id)&&drafts.size>=50)throw new Error('Publish at most 50 changes at a time.');
  drafts.set(category+'/'+id,change);selected={...selected,...metadata,id};operation=null;renderReview();renderCatalog();$('#remove-draft').hidden=false;notice(`${metadata.name} added to review. Publish when ready.`);
}catch(e){notice(e.message,true);}});
$('#publish').addEventListener('click',async()=> {
  if(publishing||!drafts.size)return;
  publishing=true;operation ||= crypto.randomUUID();$('#publish').textContent='Publishing…';renderReview();
  try {const result=await api('publish',{id:operation,head:snapshot.head,changes:[...drafts.values()]});drafts.clear();operation=null;await reload();notice(`Saved to GitHub (${result.sha.slice(0,7)}). Website deployment is pending; new values become live after the build succeeds.`);}catch(e){notice(e.message+(e.status===409?' Use Refresh to load the new version.':''),true);}finally{publishing=false;$('#publish').textContent='Publish changes ↗';renderReview();}
});
$('#discord-test').addEventListener('click',async e=>{e.target.disabled=true;try{const result=await api('discord-test',{});notice(result.sent?'Discord confirmed delivery.':`Discord test queued for retry${result.status?' (HTTP '+result.status+')':''}.`,!result.sent);await activity();}catch(e){notice(e.message,true);}finally{e.target.disabled=false;}});
window.addEventListener('beforeunload',e=>{if(drafts.size){e.preventDefault();e.returnValue='';}});
try{await start(await api('session'));}catch(e){showLogin();if(e.status!==401)$('#login-message').textContent=e.message;}
setInterval(()=>{if(auth&&!publishing)activity().catch(()=>{});},30000);

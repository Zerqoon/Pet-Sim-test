import {catalogKeys} from './catalog-state.js';
import {normalizePrice} from './price-core.js';
import {validImagePath} from './image-path.js';
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const stable=value=>JSON.stringify(value,(_key,item)=>object(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
export const baseline=(snapshot,category,id)=>({item:snapshot.catalog[catalogKeys[category]]?.find(item=>item.id===id)||null,price:snapshot.prices[category]?.[id]??null});
export const storageKey=username=>'pu-admin-draft-v128:'+username.toLowerCase();
export function draftConflicts(snapshot,saved){return new Set(saved.changes.filter(change=>stable(baseline(snapshot,change.category,change.id))!==stable(saved.base?.[change.category+'/'+change.id]||{item:null,price:null})).map(change=>change.category+'/'+change.id));}
function validChange(change){
  if(!object(change)||!Object.hasOwn(catalogKeys,change.category)||typeof change.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(change.id)||Object.keys(change).some(key=>!['category','id','action','add','supportsVariants','metadata','prices','assetPaths','artwork'].includes(key)))return false;
  if(change.action==='delete')return Object.keys(change).every(key=>['category','id','action'].includes(key));
  if(change.action!==undefined&&change.action!=='upsert'||change.add!==undefined&&typeof change.add!=='boolean'||change.supportsVariants!==undefined&&typeof change.supportsVariants!=='boolean'||!object(change.metadata))return false;
  const lengths={name:180,rarity:200,source:200,description:1000,image:240,itemGroup:200,code:200,status:200};
  for(const [key,value] of Object.entries(change.metadata)){if(key==='bestPct'){if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100))return false;}else if(!Object.hasOwn(lengths,key)||typeof value!=='string'||value.length>lengths[key]||/[\u0000-\u001f\u007f]/.test(value))return false;}
  for(const prop of ['prices','assetPaths','artwork'])if(change[prop]!==undefined){if(!object(change[prop])||Object.keys(change[prop]).some(key=>!['normal','golden','diamond'].includes(key)))return false;for(const value of Object.values(change[prop])){if(prop==='artwork'&&!uuid(value)||prop==='assetPaths'&&!validImagePath(value))return false;if(prop==='prices'){try{normalizePrice(value);}catch{return false;}}}}
  return true;
}
export function readDraft(storage,username,now=Date.now()){
  let raw;try{raw=storage.getItem(storageKey(username));}catch{return null;}if(!raw)return null;
  try{
    if(raw.length>1900000)throw new Error();const saved=JSON.parse(raw);
    if(!object(saved)||saved.version!==1||saved.owner!==username||!Number.isFinite(saved.updated)||now-saved.updated>7*86400000||saved.updated>now+300000||!/^[a-f0-9]{40}$/.test(saved.head||'')||!Array.isArray(saved.changes)||!saved.changes.length||saved.changes.length>20||!object(saved.base)||!object(saved.previews))throw new Error();
    const known=new Set();for(const change of saved.changes){const key=change.category+'/'+change.id;if(!validChange(change)||known.has(key))throw new Error();known.add(key);const base=saved.base[key];if(!object(base)||base.item!==null&&!object(base.item)||base.item&&base.item.id!==change.id)throw new Error();}
    let uploads=0;for(const [key,records] of Object.entries(saved.previews)){if(!known.has(key)||!object(records))throw new Error();const change=saved.changes.find(change=>change.category+'/'+change.id===key);for(const [variant,record] of Object.entries(records)){if(!['normal','golden','diamond'].includes(variant)||!object(record)||!uuid(record.id)||typeof record.ready!=='boolean'||!Number.isFinite(record.expires)||record.expires>now+86400000||record.preview!==undefined&&(typeof record.preview!=='string'||record.preview.length>175050||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(record.preview))||change.artwork?.[variant]!==record.id)throw new Error();uploads++;}}
    if(uploads>6)throw new Error();
    if(saved.submitted&&(!object(saved.submitted)||!uuid(saved.submitted.id)||saved.submitted.head!==saved.head||stable(saved.submitted.changes)!==stable(saved.changes)))throw new Error();return saved;
  }catch{return null;}
}
export function writeDraft(storage,username,state,now=Date.now()){
  try{if(!state.changes.length){storage.removeItem(storageKey(username));return true;}const raw=JSON.stringify({version:1,owner:username,updated:now,...state});if(raw.length>1900000)return false;storage.setItem(storageKey(username),raw);return true;}catch{return false;}
}

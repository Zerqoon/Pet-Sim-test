import {readCatalog, catalogGroups, writeCatalog} from '../server/catalog-data.js';
import {readDataModule, rowsFromPrices} from '../public/data/value-loader.js';
import {priceRevision, normalizePrice} from '../public/data/price-core.js';
import {validImagePath} from './public/image-path.js';

export class Problem extends Error { constructor(status,message) { super(message); this.status=status; } }
export const groups = {pets:'PETS',charms:'CHARMS',eggs:'EGGS',items:'ITEMS',codes:'CODES'};
const safeId = /^[a-z0-9][a-z0-9-]{0,79}$/;
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let b=0;b<8;b++)n=(n>>>1)^((n&1)?0xedb88320:0);return n>>>0;});
function text(v,max=200,optional=false) {
  if (typeof v !== 'string' || v.length>max || /[\u0000-\u001f\u007f]/.test(v) || (!optional && !v.trim())) throw new Problem(400,'Check the text fields.');
  return v.trim();
}
function price(v) {
  if(v === null || typeof v === 'number' && Number.isFinite(v) && v>=0) return v;
  if(typeof v !== 'string' || v.length>40) throw new Problem(400,'Invalid price.');
  const input=v.trim(); let normalized; try {normalized=normalizePrice(input);} catch {throw new Problem(400,'Use a number, 25K, O/C or Not Price.');}
  if(normalized.key==='unpriced') return null;
  if(normalized.key==='oc') return 'O/C';
  if(normalized.number != null) return input;
  throw new Problem(400,'Use a number, 25K, O/C or Not Price.');
}
export function decodePNG(base64) {
  if(typeof base64 !== 'string' || base64.length>175000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Problem(400,'Prepared PNG must be smaller than 128 KB.');
  let bytes; try { bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)); } catch { throw new Problem(400,'Invalid PNG.'); }
  if(bytes.length>131072 || bytes.length<45 || [137,80,78,71,13,10,26,10].some((v,i)=>bytes[i]!==v)) throw new Problem(400,'Invalid PNG.');
  const d=new DataView(bytes.buffer); let pos=8, ended=false, hasPixels=false;
  while(pos+12<=bytes.length) {
    const n=d.getUint32(pos), type=String.fromCharCode(...bytes.slice(pos+4,pos+8));
    if(n>1048576 || pos+12+n>bytes.length) throw new Problem(400,'Invalid PNG chunks.');
    if(type==='IHDR' && pos!==8) throw new Problem(400,'Duplicate PNG header.');
    if(type==='IDAT' && n>0) hasPixels=true;
    if(pos===8 && (type!=='IHDR' || n!==13 || d.getUint32(pos+8)<1 || d.getUint32(pos+12)<1 || d.getUint32(pos+8)>512 || d.getUint32(pos+12)>512)) throw new Problem(400,'Prepared PNG dimensions must be 1–512 pixels.');
    // Verify each checksum; reject damaged uploads before committing any files.
    let crc=0xffffffff;
    for(let j=pos+4;j<pos+8+n;j++) crc=(crc>>>8)^crcTable[(crc^bytes[j])&255];
    if(((crc^0xffffffff)>>>0)!==d.getUint32(pos+8+n)) throw new Problem(400,'PNG checksum failed.');
    pos+=n+12;
    if(type==='IEND') { if(n!==0 || pos!==bytes.length) throw new Problem(400,'Invalid PNG ending.'); ended=true; break; }
  }
  if(!ended || !hasPixels) throw new Problem(400,'Incomplete PNG.'); return base64;
}
export function decodeSnapshot(catalogSource,priceSource) {
  const catalog=readCatalog(catalogSource), prices=readDataModule(priceSource,'PRICES');
  rowsFromPrices(catalogGroups(catalog),prices);
  return {catalog,prices};
}
export async function editSnapshot(snapshot,input,now=new Date().toISOString(),staged=new Map()) {
  const {catalog,prices}=structuredClone(snapshot);
  if(!Array.isArray(input.changes) || !input.changes.length || input.changes.length>20) throw new Problem(400,'Publish between 1 and 20 changes.');
  const summary=[], files=[], seen=new Set();
  for(const change of input.changes) {
    if(!change || typeof change!=='object' || Array.isArray(change)) throw new Problem(400,'Invalid entry edit.');
    if(!Object.hasOwn(groups,change.category) || !safeId.test(change.id || '')) throw new Problem(400,'Invalid entry identifier.');
    if(change.action!==undefined && !['upsert','delete'].includes(change.action)) throw new Problem(400,'Unsupported entry action.');
    const key=change.category+'/'+change.id; if(seen.has(key)) throw new Problem(400,'Duplicate edit.'); seen.add(key);
    const entries=catalog[groups[change.category]], index=entries.findIndex(x=>x.id===change.id), old=entries[index];
    if(change.action==='delete') {
      if(Object.keys(change).some(key=>!['category','id','action'].includes(key))) throw new Problem(400,'A removal cannot include edits or artwork.');
      if(!old) throw new Problem(409,'This entry was already removed. Reload the catalog.');
      entries.splice(index,1);
      if(change.category!=='codes') delete prices[change.category][change.id];
      summary.push('Removed '+old.name);
      continue;
    }
    if(change.add && old || !change.add && !old) throw new Problem(409,'The entry already exists or was removed. Reload the catalog.');
    const item=old ? {...old} : {id:change.id};
    const allowed=['name','rarity','source','description','image','bestPct','itemGroup','code','status'];
    if(!change.metadata || typeof change.metadata!=='object' || Array.isArray(change.metadata)) throw new Problem(400,'Entry details are missing.');
    for(const [k,v] of Object.entries(change.metadata)) {
      if(!allowed.includes(k)) throw new Problem(400,'Unsupported entry field.');
      if(k==='bestPct') { if(v === null) delete item[k]; else {if(typeof v!=='number' || v<0 || v>100 || !Number.isFinite(v)) throw new Problem(400,'Best pet % must be 0–100.'); item[k]=v;} }
      else item[k]=text(v,k==='description'?1000:k==='name'?180:k==='image'?240:200,['description','source','image'].includes(k));
    }
    if(!item.name || !item.id) throw new Problem(400,'Name is required.');
    if(change.category==='codes') {
      if(!item.code || !['active','expired'].includes(item.status)) throw new Problem(400,'Code and status are required.');
      delete item.image;
    } else {
      if(!['Exclusive','Secret','Mythical','Legendary','Epic','Rare','Basic'].includes(item.rarity)) throw new Problem(400,'Choose a rarity.');
      if(change.category==='items' && item.itemGroup && !['general','fishing'].includes(item.itemGroup)) throw new Problem(400,'Choose General or Fishing.');
      if(change.add && change.supportsVariants) { if(change.category!=='pets') throw new Problem(400,'Only pets support variants.'); item.supportsVariants=true; }
      if(change.images) throw new Problem(400,'Upload artwork separately before publishing.');
      if(change.assetPaths!==undefined) {
        if(!change.assetPaths||typeof change.assetPaths!=='object'||Array.isArray(change.assetPaths))throw new Problem(400,'Invalid asset selection.');
        for(const [variant,path] of Object.entries(change.assetPaths)) {
          if(!['normal','golden','diamond'].includes(variant)||variant!=='normal'&&!item.supportsVariants||!validImagePath(path)||change.artwork?.[variant])throw new Problem(400,'Invalid or conflicting asset selection.');
          if(variant==='normal')item.image=path;
          if(item.supportsVariants)item.variantImages={...item.variantImages,[variant]:path};
        }
      }
      if(change.artwork && Object.keys(change.artwork).length) {
        if(typeof change.artwork !== 'object' || Array.isArray(change.artwork)) throw new Problem(400,'Invalid artwork references.');
        for(const [variant,uploadId] of Object.entries(change.artwork)) {
          if(!['normal','golden','diamond'].includes(variant) || variant!=='normal' && !item.supportsVariants) throw new Problem(400,'Unsupported artwork.');
          const sha=staged.get(uploadId);
          if(!/^[a-f0-9]{40}$/.test(sha || '')) throw new Problem(400,'Artwork upload expired. Select the PNG again.');
          const path=`assets/${change.category}/${item.id}${variant==='normal'?'':'-'+variant}.png`;
          files.push({path:'public/'+path,sha});
          if(variant==='normal') item.image=path; if(item.supportsVariants) item.variantImages={...item.variantImages,[variant]:path};
        }
      }
      const normalImage=item.image||item.variantImages?.normal;
      if(item.supportsVariants && normalImage && (!item.variantImages?.normal || item.image && item.image!==old?.image)) item.variantImages={...item.variantImages,normal:normalImage};
      if(!validImagePath(normalImage)) throw new Problem(400,'Provide a PNG image or an existing assets path.');
      const values=change.prices;
      if(!values || typeof values!=='object' || Array.isArray(values)) throw new Problem(400,'Prices are required.');
      const variants=item.supportsVariants?['normal','golden','diamond']:['normal'];
      if(Object.keys(values).some(k=>!variants.includes(k)) || variants.some(k=>!Object.hasOwn(values,k))) throw new Problem(400,'Check every price field.');
      prices[change.category][change.id]=item.supportsVariants?Object.fromEntries(variants.map(k=>[k,price(values[k])])):price(values.normal);
    }
    if(old && JSON.stringify(old)===JSON.stringify(item) && (change.category==='codes' || JSON.stringify(snapshot.prices[change.category][change.id])===JSON.stringify(prices[change.category][change.id])) && !Object.keys(change.artwork || {}).length) continue;
    if(old) entries[index]=item; else entries.push(item);
    summary.push(`${change.add?'Added':'Updated'} ${item.name}`);
  }
  if(!summary.length) throw new Problem(400,'No changes to publish.');
  if(files.length>6) throw new Problem(400,'Upload at most six images per publish.');
  const rows=rowsFromPrices(catalogGroups(catalog),prices), revision=await priceRevision(rows);
  const oldRevision=await priceRevision(rowsFromPrices(catalogGroups(snapshot.catalog),snapshot.prices));
  files.push({path:'public/data/catalog.js',content:writeCatalog(catalog),encoding:'utf-8'});
  if(JSON.stringify(prices)!==JSON.stringify(snapshot.prices)) files.push({path:'public/data/prices.js',content:'// Single price source. Edited through the private admin panel.\nexport const PRICES = '+JSON.stringify(prices,null,2)+';\n',encoding:'utf-8'});
  if(revision!==oldRevision) files.push({path:'public/data/price-updates.js',content:'// Generated price timestamp. Do not edit.\nexport const PRICE_UPDATE = '+JSON.stringify({version:1,revision,updatedAt:now,source:'admin'},null,2)+';\n',encoding:'utf-8'});
  return {catalog,prices,files,summary,revision};
}

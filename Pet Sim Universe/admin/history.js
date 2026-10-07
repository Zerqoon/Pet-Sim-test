import {groups} from './data.js';
import {normalizePrice} from '../public/data/price-core.js';
export async function catalogFingerprint(catalog) {
  const source=JSON.stringify(catalog,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)))].map(value=>value.toString(16).padStart(2,'0')).join('');
}
export function changeDetails(before,after,changes) {
  const details=[];
  for(const change of changes){
    const old=before.catalog[groups[change.category]].find(item=>item.id===change.id),item=after.catalog[groups[change.category]].find(item=>item.id===change.id),kind=!item?'delete':!old?'add':'update';
    const previous=before.prices[change.category]?.[change.id],next=after.prices[change.category]?.[change.id];
    if(kind==='update'&&JSON.stringify(old)===JSON.stringify(item)&&JSON.stringify(previous)===JSON.stringify(next)&&!Object.keys(change.artwork||{}).length)continue;
    const prices=change.category==='codes'?[]:(item?.supportsVariants||old?.supportsVariants?['normal','golden','diamond']:['normal']).map(variant=>{
      const a=old?.supportsVariants?previous?.[variant]:previous,b=item?.supportsVariants?next?.[variant]:next;
      return {variant,before:normalizePrice(a).label,after:normalizePrice(b).label,changed:normalizePrice(a).key!==normalizePrice(b).key};
    });
    details.push({category:change.category,id:change.id,kind,name:item?.name||old?.name,prices,fields:Object.keys(change.metadata||{}).filter(key=>JSON.stringify(old?.[key])!==JSON.stringify(item?.[key]))});
  }
  return details;
}

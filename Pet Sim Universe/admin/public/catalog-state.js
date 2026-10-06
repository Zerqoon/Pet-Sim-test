export const categories={pets:'Pets',charms:'Charms',eggs:'Eggs',items:'Items',codes:'Codes'};
export const catalogKeys={pets:'PETS',charms:'CHARMS',eggs:'EGGS',items:'ITEMS',codes:'CODES'};
export const rarityColors={Exclusive:'#a66bff',Secret:'#d8dde8',Mythical:'#ff4e9a',Legendary:'#ffd33f',Epic:'#34d8ff',Rare:'#7ef23a',Basic:'#8f98a8'};
export const priceLabel=value=>value===null || value===undefined || /^(?:\?+|null|not priced?|no price|n\/a|unknown)?$/i.test(String(value).trim())?'Not Price':String(value);
export const changeKind=change=>change?.action==='delete'?'delete':change?.add?'add':'update';
export function reviewStats(drafts) {
  const counts={add:0,update:0,delete:0,total:0};
  for(const change of drafts.values()){counts[changeKind(change)]++;counts.total++;}
  return counts;
}
const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
export function catalogEntries(snapshot,drafts,category,{term='',group='all',rarity='all',sort='catalog'}={}) {
  const original=snapshot.catalog[catalogKeys[category]]||[],known=new Set(original.map(item=>item.id));
  const added=[...drafts.values()].filter(change=>change.category===category && change.add && !known.has(change.id)).map(change=>({...change.metadata,id:change.id,supportsVariants:change.supportsVariants}));
  const query=term.trim().toLowerCase();
  const rows=[...original,...added].map(original=>{const draft=drafts.get(category+'/'+original.id);return {original,item:{...original,...draft?.metadata},draft};}).filter(({item})=>
    (!query || [item.name,item.id,item.source,item.code].filter(Boolean).join(' ').toLowerCase().includes(query)) &&
    (category!=='items' || group==='all' || (item.itemGroup||'general')===group) &&
    (category==='codes' || rarity==='all' || item.rarity===rarity));
  if(sort==='name')rows.sort((a,b)=>collator.compare(a.item.name,b.item.name));
  if(sort==='pending')rows.sort((a,b)=>Number(!!b.draft)-Number(!!a.draft));
  return rows;
}

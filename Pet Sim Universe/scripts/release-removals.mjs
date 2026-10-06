// The owner's requested v127 cleanup. Exact identifiers only; keep other cards and prices.
export const releaseRemovals=Object.freeze([
  {category:'pets',id:'exquisite-peacock',name:'Exquisite Peacock'},
  {category:'pets',id:'imp',name:'Imp'},
  {category:'pets',id:'shadow-dominus',name:'Shadow Dominus'},
  {category:'charms',id:'fishing-charm-i',name:'Fishing Charm I'},
  {category:'charms',id:'fishing-charm-ii',name:'Fishing Charm II'},
  {category:'items',id:'squeaky',name:'Squeaky'},
  {category:'items',id:'ball',name:'Ball'},
  {category:'items',id:'fishhook',name:'Fish Hook'},
  {category:'items',id:'worm',name:'Worm'},
]);
const groups={pets:'PETS',charms:'CHARMS',eggs:'EGGS',items:'ITEMS',codes:'CODES'};
export function pendingReleaseRemovals(snapshot) {
  return releaseRemovals.filter(entry=>snapshot.catalog[groups[entry.category]].some(item=>item.id===entry.id)).map(({category,id})=>({category,id,action:'delete'}));
}

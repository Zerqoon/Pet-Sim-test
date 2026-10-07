import {normalizePrice} from './price-core.js';
export {normalizePrice};
export const variantTitle=variant=>variant[0].toUpperCase()+variant.slice(1);
export function valueDelta(before,after){
  let a,b;try{a=normalizePrice(before);b=normalizePrice(after);}catch{return {valid:false,before:'Invalid value',after:'Invalid value',kind:'error',text:'Use a number, O/C or Not Price'};}
  const result={valid:true,before:a.label,after:b.label};
  if(a.key===b.key)return {...result,kind:'same',text:'Unchanged'};
  if(a.number!==null&&b.number!==null){const delta=b.number-a.number,percent=a.number?Math.abs(delta/a.number*100):null;return {...result,kind:delta>0?'up':'down',text:percent===null?'New value':!Number.isFinite(percent)?'Large increase':(delta>0?'+':'−')+Number(percent.toFixed(2))+'%'};}
  return {...result,kind:'changed',text:b.key==='unpriced'?'Now unpriced':a.key==='unpriced'?'Value added':'Value changed'};
}

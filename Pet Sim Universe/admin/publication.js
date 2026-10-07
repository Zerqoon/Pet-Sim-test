import {decodeSnapshot} from './data.js';
import {catalogFingerprint} from './history.js';
import {catalogGroups} from '../server/catalog-data.js';
import {rowsFromPrices} from '../public/data/value-loader.js';
import {priceRevision} from '../public/data/price-core.js';
async function published(response){
  if(!response.ok)throw new Error();const reader=response.body?.getReader();if(!reader)throw new Error();let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>200000){await reader.cancel();throw new Error();}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export async function publicationStatus(env,record,fetcher=fetch){
  const result={sha:record.sha,website:'unknown',discord:record.sent?'delivered':record.status>=400?'retry':'queued'};
  let saved;try{saved=JSON.parse(record.result);}catch{return result;}
  if(!saved||!/^[a-f0-9]{64}$/.test(saved.catalogStamp||'')||!/^[a-f0-9]{64}$/.test(saved.revision||''))return result;
  try{
    const site=new URL(env.SITE_URL||'https://petuniverse-values.pl');if(site.protocol!=='https:'||site.username||site.password)throw new Error();
    const [catalog,prices]=await Promise.all(['catalog','prices'].map(async name=>{
      const url=new URL('/data/'+name+'.js',site.origin);url.search=new URLSearchParams({admin:record.sha,t:String(Date.now())});
      return published(await fetcher(url.href,{redirect:'manual',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(12000)}));
    }));
    const live=decodeSnapshot(catalog,prices),stamp=await catalogFingerprint(live.catalog),revision=await priceRevision(rowsFromPrices(catalogGroups(live.catalog),live.prices));
    result.website=stamp===saved.catalogStamp&&revision===saved.revision?'live':'updating';
  }catch{result.website='unknown';}return result;
}

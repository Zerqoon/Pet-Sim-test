import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { normalizePrice, priceRevision, selectPriceUpdate, applyFeedPrices } from '../public/data/price-core.js';
import { boundedText, loadCurrentPrices, readDataModule, rowsFromPrices } from '../public/data/value-loader.js';
import { readPriceCache, savePriceCache } from '../public/data/price-cache.js';
import { messageGroups, sendDiscord } from '../workers/discord-delivery.js';
import { onRequestPost } from '../functions/api/snapshot.js';
import { PETS,CHARMS,EGGS,ITEMS } from '../public/data/catalog.js';
const site='https://petuniverse-values.pl';
const now=Date.parse('2026-10-04T16:00:00Z');
const catalogs={pets:[{id:'test-pet',name:'Test Pet'}],charms:[],eggs:[],items:[]};
const source='export const PRICES = {pets:{"test-pet":25000},charms:{},eggs:{},items:{}};';
const fullCatalogs={pets:PETS,charms:CHARMS,eggs:EGGS,items:ITEMS};

test('decimal commas cannot silently multiply fractional prices or accept malformed separators',()=>{
 for(const [value,number] of [['0,4',.4],['22,5K',22500],['30,000',30000],['1,234.5',1234.5],['0,350',.35]])assert.equal(normalizePrice(value).number,number);
 for(const value of ['1,2,3','1.2,3','30,,000','9'.repeat(65),NaN,Infinity,-1])assert.throws(()=>normalizePrice(value));
 assert.throws(()=>readDataModule('export const PRICES={pets:{x:012}};','PRICES'));
 assert.equal(selectPriceUpdate('r',{revision:'r',updatedAt:'2026-10-05T00:00:00Z'},now),null);
});

test('oversized and malformed streamed responses reject safely and cancel readers',async()=>{
 await assert.rejects(()=>boundedText(new Response('abc',{headers:{'content-length':'200001'}})),/large/);
 let cancelled=false;
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(200001));},cancel(){cancelled=true;}});
 await assert.rejects(()=>boundedText(new Response(stream)),/large/);assert.equal(cancelled,true);
 await assert.rejects(()=>boundedText(new Response(new Uint8Array([0xff]))));
});

test('metadata fallback accepts only matching revision and preserves actual fresh prices',async()=>{
 const revision=await priceRevision(rowsFromPrices(catalogs,readDataModule(source,'PRICES')));
 for(const matching of [true,false]){
  const loaded=await loadCurrentPrices(site,{catalogs,now,monitorUrl:'https://monitor.workers.dev',fetcher:async url=>{
   const path=new URL(url).pathname;
   if(path==='/data/prices.js')return new Response(source);
   if(path==='/data/price-updates.js')return new Response('bad old metadata');
   assert.equal(path,'/status');return Response.json({version:116,update:{revision:matching?revision:'old',updatedAt:'2026-10-04T15:00:00Z',source:'detected'}});
  }});
  assert.equal(loaded.rows[0].price.number,25000);assert.equal(loaded.updatedAt,matching?'2026-10-04T15:00:00.000Z':null);
 }
});

test('cache rejects corrupt, incomplete, stale and mismatched snapshots without mutating selections',async()=>{
 let text;const storage={getItem:()=>text,setItem:(k,v)=>{text=v;}};
 const latest=await loadCurrentPrices(site,{catalogs,now,fetcher:async url=>new Response(new URL(url).pathname==='/data/prices.js'?source:'export const PRICE_UPDATE = {};')});
 assert.equal(savePriceCache(latest,storage,now),true);
 const valid=text;assert.equal((await readPriceCache(catalogs,site,storage,now)).revision,latest.revision);
 const pet=catalogs.pets[0];applyFeedPrices(catalogs,(await readPriceCache(catalogs,site,storage,now)).rows);assert.equal(pet.value,25000);
 for(const patch of [{revision:'wrong'},{rows:[]},{savedAt:now-8*86400000},{savedAt:now+3600000},{version:2}]){
  text=JSON.stringify({...JSON.parse(valid),...patch});assert.equal(await readPriceCache(catalogs,site,storage,now),null);assert.equal(pet.value,25000);
 }
 text='broken';assert.equal(await readPriceCache(catalogs,site,storage,now),null);
 assert.equal(savePriceCache(latest,{setItem(){throw Error('quota');}},now),false);
});

test('Discord groups obey embed character budget and use fractional server retry delay',async()=>{
 const events=Array.from({length:10},(_,i)=>({id:String(i),payload:JSON.stringify({embeds:[{title:String(i),description:'a'.repeat(2800)}]})}));
 assert.deepEqual(messageGroups(events).map(g=>g.ids.length),[2,2,2,2,2]);
 const limited=await sendDiscord(async()=>Response.json({retry_after:1.25},{status:429}),'https://discord.com',{});
 assert.equal(limited.retryMs,1250);assert.equal(limited.ok,false);
 const accepted=await sendDiscord(async()=>Response.json({},{headers:{'x-ratelimit-remaining':'0','x-ratelimit-reset-after':'2.5'}}),'https://discord.com',{});
 assert.equal(accepted.resetMs,2500);assert.equal(accepted.ok,true);
});

test('every numeric history stream fits one insert and only real changes add records',async()=>{
 const sql=new DatabaseSync(':memory:');let queries=0;
 const db={prepare(text){let args=[];const statement={bind(...values){args=values;return statement;},async run(){queries++;const result=sql.prepare(text).run(...args);return {meta:{changes:Number(result.changes)}};}};return statement;}};
 let prices=readDataModule(await readFile(new URL('../public/data/prices.js',import.meta.url),'utf8'),'PRICES');
 const expectedCount=rowsFromPrices(fullCatalogs,prices).filter(row=>normalizePrice(row.value).number!=null).length;
 const context={env:{VALUES_DB:db},request:new Request(site+'/api/snapshot',{method:'POST'}),fetcher:async url=>new Response(new URL(url).pathname==='/data/prices.js'?`export const PRICES=${JSON.stringify(prices)};`:'export const PRICE_UPDATE={};')};
 try{
  const initial=await (await onRequestPost(context)).json();assert.equal(initial.inserted,expectedCount);assert.equal(initial.checked,expectedCount);assert.ok(queries<50);
  queries=0;assert.equal((await (await onRequestPost(context)).json()).inserted,0);
  prices.items['golden-fish-hook']=26;assert.equal((await (await onRequestPost(context)).json()).inserted,1);
  const count=Number(sql.prepare('SELECT count(*) n FROM value_history').get().n);assert.equal(count,expectedCount+1);
  context.fetcher=async()=>new Response('export const PRICES = (()=>1)();');assert.equal((await (await onRequestPost(context)).json()).available,false);
  assert.equal(Number(sql.prepare('SELECT count(*) n FROM value_history').get().n),expectedCount+1);
 }finally{sql.close();}
});

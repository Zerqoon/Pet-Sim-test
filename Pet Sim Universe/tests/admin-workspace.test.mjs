import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {decodeSnapshot,editSnapshot} from '../admin/data.js';
import {catalogFingerprint,changeDetails} from '../admin/history.js';
import {publicationStatus} from '../admin/publication.js';
import {github} from '../admin/github.js';
import {valueDelta} from '../admin/public/value-math.js';
import {baseline,draftConflicts,readDraft,writeDraft,storageKey} from '../admin/public/draft-store.js';
import {writeCatalog,catalogGroups} from '../server/catalog-data.js';
import {priceRevision} from '../public/data/price-core.js';
import {rowsFromPrices} from '../public/data/value-loader.js';
const catalog=await readFile(new URL('../public/data/catalog.js',import.meta.url),'utf8'),prices=await readFile(new URL('../public/data/prices.js',import.meta.url),'utf8');
const snapshot=decodeSnapshot(catalog,prices),head='a'.repeat(40),id='10000000-1000-4000-8000-000000000001',upload='10000000-1000-4000-8000-000000000002';
const edit=(extra={})=>({category:'pets',id:'gummy-bear',metadata:{},prices:{normal:'20K'},...extra});
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
const state=(changes=[edit()])=>({head,changes,base:Object.fromEntries(changes.map(change=>[change.category+'/'+change.id,baseline(snapshot,change.category,change.id)])),previews:{},submitted:null});
async function publicationRecord(){return {sha:head,status:204,sent:123,result:JSON.stringify({catalogStamp:await catalogFingerprint(snapshot.catalog),revision:await priceRevision(rowsFromPrices(catalogGroups(snapshot.catalog),snapshot.prices))})};}
const sources=(cat=catalog,price=prices)=>(url,options)=>{assert.equal(options.redirect,'manual');assert.equal(options.headers.authorization,undefined);assert.equal(options.headers.cookie,undefined);assert.equal(new URL(url).origin,'https://petuniverse-values.pl');return new Response(new URL(url).pathname.endsWith('/catalog.js')?cat:price);};
test('value comparisons handle compact prices, zero, unpriced and O/C without misleading percentages',()=>{
  assert.equal(valueDelta('18K','20K').text,'+11.11%');assert.equal(valueDelta('20K','18K').text,'−10%');assert.equal(valueDelta(0,100).text,'New value');assert.equal(valueDelta('18K',18000).kind,'same');assert.equal(valueDelta('???',null).kind,'same');assert.equal(valueDelta('18K','Null').text,'Now unpriced');assert.equal(valueDelta(null,'20K').text,'Value added');assert.equal(valueDelta('O/C','20K').kind,'changed');for(const value of [-1,'2KK','Infinity',{},'<script>'])assert.equal(valueDelta(1,value).valid,false);
});
test('drafts retain exact changes and private owner scope across refresh',()=>{
  const storage=memory(),saved=state();assert.equal(writeDraft(storage,'Zerqoon',saved),true);assert.deepEqual(readDraft(storage,'Zerqoon').changes,saved.changes);assert.equal(readDraft(storage,'Pioterek'),null);assert.equal(readDraft(storage,'zerqoon'),null);assert.equal(writeDraft(storage,'Zerqoon',{changes:[]}),true);assert.equal(readDraft(storage,'Zerqoon'),null);
});
test('uncertain publication keeps its exact request ID, head and changes',()=>{
  const storage=memory(),saved=state();saved.submitted={id,head,changes:structuredClone(saved.changes)};writeDraft(storage,'Zerqoon',saved);assert.deepEqual(readDraft(storage,'Zerqoon').submitted,saved.submitted);const broken=JSON.parse(storage.getItem(storageKey('Zerqoon')));broken.submitted.changes[0].prices.normal='100K';storage.setItem(storageKey('Zerqoon'),JSON.stringify(broken));assert.equal(readDraft(storage,'Zerqoon'),null);
});
test('corrupt and expired local storage never crashes or becomes a usable draft',()=>{
  const storage=memory(),saved=state();for(const raw of ['{','null','[]',JSON.stringify({...saved,version:1,owner:'Zerqoon',updated:Date.now(),changes:[null]}),'x'.repeat(1900001)]){storage.setItem(storageKey('Zerqoon'),raw);assert.equal(readDraft(storage,'Zerqoon'),null);}
  writeDraft(storage,'Zerqoon',saved,Date.now()-8*86400000);assert.equal(readDraft(storage,'Zerqoon'),null);for(const mutated of [{...saved,base:[]},{...saved,previews:{'pets/gummy-bear':{normal:null}}},{...saved,changes:[edit({metadata:{image:[]}})]},{...saved,changes:[edit(),edit()]}]){writeDraft(storage,'Zerqoon',mutated);assert.equal(readDraft(storage,'Zerqoon'),null);}
  const unavailable={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};assert.equal(readDraft(unavailable,'Zerqoon'),null);assert.equal(writeDraft(unavailable,'Zerqoon',saved),false);
});
test('PNG draft recovery validates upload references and tracks expiry',()=>{
  const storage=memory(),saved=state([edit({artwork:{normal:upload}})]);saved.previews={'pets/gummy-bear':{normal:{id:upload,ready:true,expires:Date.now()+3600000,preview:'data:image/png;base64,AAAA'}}};writeDraft(storage,'Zerqoon',saved);assert.equal(readDraft(storage,'Zerqoon').previews['pets/gummy-bear'].normal.id,upload);saved.previews['pets/gummy-bear'].normal.id=id;writeDraft(storage,'Zerqoon',saved);assert.equal(readDraft(storage,'Zerqoon'),null);
});
test('draft conflicts compare edited cards and preserve unrelated remote additions',()=>{
  const saved=state(),current=structuredClone(snapshot);current.catalog.PETS.push({id:'new-pet',name:'New'});assert.equal(draftConflicts(current,saved).size,0);current.prices.pets['gummy-bear']='15K';assert.deepEqual([...draftConflicts(current,saved)],['pets/gummy-bear']);const removed=structuredClone(snapshot);removed.catalog.PETS=removed.catalog.PETS.filter(item=>item.id!=='gummy-bear');assert.equal(draftConflicts(removed,saved).size,1);
});
test('gallery choices update Normal, Golden and Diamond without changing prices',async()=>{
  const item=snapshot.catalog.PETS.find(item=>item.supportsVariants);assert.ok(item);const change={category:'pets',id:item.id,metadata:{},prices:structuredClone(snapshot.prices.pets[item.id]),assetPaths:{normal:'assets/pets/gummy-bear.png',golden:'assets/pets/Fishing Pet.png',diamond:'assets/sources/Gummy Egg.png'}};
  const result=await editSnapshot(snapshot,{changes:[change]});assert.deepEqual(result.catalog.PETS.find(entry=>entry.id===item.id).variantImages,change.assetPaths);assert.equal(result.catalog.PETS.find(entry=>entry.id===item.id).image,change.assetPaths.normal);assert.equal(result.revision,await priceRevision(rowsFromPrices(catalogGroups(snapshot.catalog),snapshot.prices)));for(const [id,value] of Object.entries(snapshot.prices.pets))if(id!==item.id)assert.deepEqual(result.prices.pets[id],structuredClone(value));assert.ok(!result.files.some(file=>file.path.endsWith('price-updates.js')));
  for(const assetPaths of [null,[],{bad:'assets/pets/gummy-bear.png'},{normal:'../escape.png'},{normal:'assets/pets/x.png?token=secret'}])await assert.rejects(()=>editSnapshot(snapshot,{changes:[{...change,assetPaths}]}));
  await assert.rejects(()=>editSnapshot(snapshot,{changes:[{...edit(),assetPaths:{golden:'assets/pets/gummy-bear.png'}}]}));await assert.rejects(()=>editSnapshot(snapshot,{changes:[{...change,artwork:{normal:upload}}]},undefined,new Map([[upload,'c'.repeat(40)]])));
});
test('asset inventory is restricted to allowed PNG paths inside the project at one revision',async()=>{
  const calls=[],api=github({GITHUB_TOKEN:'private-test-token'},async(url,options)=>{calls.push(url);assert.equal(options.redirect,'manual');if(url.includes('/git/commits/'))return Response.json({tree:{sha:'c'.repeat(40)}});return Response.json({truncated:false,tree:[{type:'blob',path:'Pet Sim Universe/public/assets/pets/Fish Hook.png',size:123,sha:head},{type:'blob',path:'other/public/assets/pets/private.png',size:123},{type:'blob',path:'Pet Sim Universe/private-setup/password.png',size:123},{type:'blob',path:'Pet Sim Universe/public/assets/pets/../hidden.png',size:123},{type:'blob',path:'Pet Sim Universe/public/assets/pets/too-large.png',size:9000000},{type:'tree',path:'Pet Sim Universe/public/assets/pets/folder.png',size:123}]});});
  assert.deepEqual((await api.assets(head)).map(item=>item.path),['assets/pets/Fish Hook.png']);assert.match(calls[0],new RegExp(head+'$'));assert.match(calls[1],/recursive=1$/);await assert.rejects(()=>api.assets('main'));assert.equal(calls.length,2);
});
test('truncated repository trees do not present a partial asset library as complete',async()=>{const api=github({GITHUB_TOKEN:'test'},async url=>Response.json(url.includes('/git/commits/')?{tree:{sha:head}}:{truncated:true,tree:[]}));await assert.rejects(()=>api.assets(head),error=>error.status===502);});
test('website becomes live only when both catalog and price content match the publication',async()=>{
  const record=await publicationRecord();assert.equal((await publicationStatus({},record,sources())).website,'live');const updated=structuredClone(snapshot.catalog);updated.PETS[0].description+=' Edited.';assert.equal((await publicationStatus({},record,sources(writeCatalog(updated)))).website,'updating');const edited=await editSnapshot(snapshot,{changes:[edit()]});const price=edited.files.find(file=>file.path.endsWith('prices.js')).content;assert.equal((await publicationStatus({},record,sources(catalog,price))).website,'updating');
});
test('metadata-only publications receive a different catalog fingerprint at the same price revision',async()=>{
  const edited=await editSnapshot(snapshot,{changes:[edit({prices:{normal:'18K'},metadata:{description:'A changed description.'}})]});assert.notEqual(await catalogFingerprint(edited.catalog),await catalogFingerprint(snapshot.catalog));assert.equal(edited.revision,JSON.parse((await publicationRecord()).result).revision);
});
test('network errors, redirects, invalid code and oversized responses never report Website live',async()=>{
  const record=await publicationRecord();for(const fetcher of [async()=>{throw Error('Offline');},async()=>new Response(null,{status:302}),async()=>new Response('broken source'),async()=>new Response('x'.repeat(200001)),async()=>new Response('',{status:503})])assert.equal((await publicationStatus({},record,fetcher)).website,'unknown');
});
test('legacy activity remains unconfirmed without fetching or inventing a deployment status',async()=>{let calls=0;for(const result of [null,'{','{}','null',JSON.stringify({revision:'z'.repeat(64),catalogStamp:'z'.repeat(64)})])assert.equal((await publicationStatus({}, {sha:head,result},async()=>{calls++;throw Error();})).website,'unknown');assert.equal(calls,0);});
test('Discord status follows actual delivery independently of the website',async()=>{
  const record=await publicationRecord();assert.equal((await publicationStatus({},record,sources())).discord,'delivered');record.sent=null;record.status=429;const retry=await publicationStatus({},record,sources());assert.equal(retry.website,'live');assert.equal(retry.discord,'retry');record.status=null;assert.equal((await publicationStatus({},record,sources())).discord,'queued');
});
test('history records price deltas, metadata, variant changes and removals without raw requests',async()=>{
  const item=snapshot.catalog.PETS.find(item=>item.supportsVariants),changes=[edit(),{category:'pets',id:item.id,metadata:{description:'Changed'},prices:{...snapshot.prices.pets[item.id],diamond:'300K'}}];const edited=await editSnapshot(snapshot,{changes});const details=changeDetails(snapshot,edited,changes);assert.equal(details[0].prices[0].before,'18K');assert.equal(details[0].prices[0].after,'20K');assert.ok(details[1].prices.some(value=>value.variant==='diamond'&&value.changed));assert.deepEqual(details[1].fields,['description']);const deleted=await editSnapshot(snapshot,{changes:[{category:'pets',id:item.id,action:'delete'}]});assert.equal(changeDetails(snapshot,deleted,[{category:'pets',id:item.id,action:'delete'}])[0].kind,'delete');assert.ok(!JSON.stringify(details).includes('requestHash'));
});

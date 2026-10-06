import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {decodeSnapshot,editSnapshot,groups} from '../admin/data.js';
import {catalogEntries,reviewStats,priceLabel} from '../admin/public/catalog-state.js';
import {releaseRemovals,pendingReleaseRemovals} from '../scripts/release-removals.mjs';
import {applyReleaseRemovals} from '../scripts/apply-release-removals.mjs';
import {readDataModule} from '../public/data/value-loader.js';
import {writeCatalog} from '../server/catalog-data.js';
import {pruneLocalRelease} from '../scripts/prune-local-release.mjs';
const snapshot=decodeSnapshot(await readFile(new URL('../public/data/catalog.js',import.meta.url),'utf8'),await readFile(new URL('../public/data/prices.js',import.meta.url),'utf8'));
const head='a'.repeat(40),nextHead='b'.repeat(40);
function legacy(){
  const data=structuredClone(snapshot);
  for(const entry of releaseRemovals){data.catalog[groups[entry.category]].push({id:entry.id,name:entry.name,rarity:'Rare',image:'assets/items/worm.png',...(entry.category==='pets'?{supportsVariants:true,variantImages:{normal:'assets/pets/imp.png',golden:'assets/pets/imp-golden.png',diamond:'assets/pets/imp-diamond.png'}}:{})});data.prices[entry.category][entry.id]=entry.category==='pets'?{normal:10,golden:null,diamond:'???'}:10;}
  return data;
}
test('the release removes only the nine requested IDs, including their variant prices',async()=>{
  const original=legacy(),changes=pendingReleaseRemovals(original);assert.equal(changes.length,9);
  const edited=await editSnapshot(original,{changes});
  assert.equal(JSON.stringify(edited.catalog),JSON.stringify(structuredClone(snapshot.catalog)));assert.deepEqual(edited.prices,structuredClone(snapshot.prices));
  assert.equal(original.catalog.PETS.length,35,'The input snapshot must not be mutated');
  assert.ok(edited.catalog.ITEMS.some(item=>item.id==='golden-fish-hook'));assert.ok(edited.catalog.ITEMS.some(item=>item.id==='universeworm'));assert.ok(edited.catalog.CHARMS.some(item=>item.id==='fishing-charm-iii'));
  const date=readDataModule(edited.files.find(file=>file.path.endsWith('price-updates.js')).content,'PRICE_UPDATE');assert.equal(date.revision,edited.revision);
});
test('cards can be deleted from every category and code-only removal keeps price metadata unchanged',async()=>{
  for(const [category,name] of Object.entries(groups)){
    const item=snapshot.catalog[name][0],edited=await editSnapshot(snapshot,{changes:[{category,id:item.id,action:'delete'}]});
    assert.equal(edited.catalog[name].some(entry=>entry.id===item.id),false);
    if(category==='codes'){assert.deepEqual(edited.prices,structuredClone(snapshot.prices));assert.deepEqual(edited.files.map(file=>file.path),['public/data/catalog.js']);}
    else{assert.equal(Object.hasOwn(edited.prices[category],item.id),false);assert.equal(edited.files.length,3);}
  }
});
test('invalid or mixed removal requests reject atomically and cannot smuggle artwork',async()=>{
  const before=JSON.stringify(snapshot),remove={category:'pets',id:'queen-bee',action:'delete'};
  for(const changes of [[{...remove,id:'missing'}],[remove,remove],[{...remove,category:'__proto__'}],[{...remove,id:'../escape'}],[{...remove,metadata:{name:'Bad'}}],[{...remove,artwork:{normal:'upload'}}],[{...remove,add:true}],[{...remove,action:'erase'}],[remove,{category:'items',id:'missing',action:'delete'}]])await assert.rejects(()=>editSnapshot(snapshot,{changes}));
  assert.equal(JSON.stringify(snapshot),before);
});
test('a review supports mixed updates, additions and removals without mutating current entries',()=>{
  const drafts=new Map([['pets/queen-bee',{category:'pets',id:'queen-bee',action:'delete'}],['items/new-bait',{category:'items',id:'new-bait',add:true,metadata:{name:'New Bait',itemGroup:'fishing',rarity:'Rare'}}],['items/universeworm',{category:'items',id:'universeworm',metadata:{name:'Updated Universe Worm'}}]]);
  assert.deepEqual(reviewStats(drafts),{add:1,update:1,delete:1,total:3});
  const queued=catalogEntries(snapshot,drafts,'pets',{term:'Queen Bee'});assert.equal(queued[0].draft.action,'delete');
  drafts.delete('pets/queen-bee');assert.equal(catalogEntries(snapshot,drafts,'pets',{term:'Queen Bee'})[0].draft,undefined);assert.ok(snapshot.catalog.PETS.some(item=>item.id==='queen-bee'));
  const fishing=catalogEntries(snapshot,drafts,'items',{group:'fishing',rarity:'Rare'});assert.deepEqual(fishing.map(row=>row.item.id),['new-bait']);
  const renamed=catalogEntries(snapshot,drafts,'items',{term:'Updated Universe Worm'});assert.equal(renamed[0].item.id,'universeworm');assert.equal(snapshot.catalog.ITEMS.find(item=>item.id==='universeworm').name,'Universe Worm');
});
test('all admin missing-price spellings remain Not Price and a zero remains priced',()=>{
  for(const value of [null,undefined,'???','??','Null','Not Price','Not priced','No Price','N/A',''])assert.equal(priceLabel(value),'Not Price');assert.equal(priceLabel(0),'0');assert.equal(priceLabel('O/C'),'O/C');
});

async function cleanupFixture({interrupt=false,fail=0,stale=false}={}){
  const directory=await mkdtemp(path.join(tmpdir(),'pet-v127-cleanup-'));let state=legacy(),currentHead=head,interrupted=false,publishes=0,logouts=0;const inputs=[],operations=new Map();
  const fetcher=async(url,options)=>{
    const route=new URL(url).pathname,body=options.body?JSON.parse(options.body):undefined;
    assert.equal(options.redirect,'error');
    if(route==='/api/login'){assert.equal(body.password,'private-test-password');return Response.json({username:'Zerqoon',csrf:'test-csrf'},{headers:{'set-cookie':'__Host-pu_admin=session; Path=/; Secure; HttpOnly'}});}
    assert.equal(options.headers.cookie,'__Host-pu_admin=session');
    if(route==='/api/catalog')return Response.json({head:currentHead,...state});
    assert.equal(options.headers['x-csrf-token'],'test-csrf');
    if(route==='/api/logout'){logouts++;return Response.json({ok:true});}
    if(route==='/api/publish'){
      inputs.push(structuredClone(body));if(fail)return Response.json({error:'Temporary failure'},{status:fail});
      if(stale){stale=false;currentHead='c'.repeat(40);return Response.json({error:'The repository changed. Reload and review your edits.'},{status:409});}
      if(operations.has(body.id))return Response.json(operations.get(body.id));
      assert.equal(body.head,currentHead);const edited=await editSnapshot(state,body);state={catalog:edited.catalog,prices:edited.prices};currentHead=nextHead;publishes++;
      const result={sha:nextHead,summary:edited.summary};operations.set(body.id,result);
      if(interrupt&&!interrupted){interrupted=true;throw new Error('Connection interrupted after commit');}return Response.json(result);
    }
    throw new Error('Unexpected URL');
  };
  const run=()=>applyReleaseRemovals('https://admin.example',{username:'Zerqoon',password:'private-test-password'},{configDirectory:directory,fetcher,wait:async()=>{}});
  return {run,directory,inputs,getState:()=>state,publishes:()=>publishes,logouts:()=>logouts,setFailure:value=>fail=value,close:()=>rm(directory,{recursive:true,force:true})};
}
test('the updater removes remote requested entries while preserving all other cards and values',async()=>{
  const f=await cleanupFixture();try{const result=await f.run();assert.equal(result.removed.length,9);assert.equal(f.publishes(),1);assert.equal(f.logouts(),1);assert.deepEqual(f.getState().prices,structuredClone(snapshot.prices));const repeat=await f.run();assert.equal(repeat.alreadyApplied,true);assert.equal(f.publishes(),1);}finally{await f.close();}
});
test('an interrupted cleanup retries the same operation without a second commit',async()=>{
  const f=await cleanupFixture({interrupt:true});try{await f.run();assert.equal(f.publishes(),1);assert.equal(f.inputs.length,2);assert.deepEqual(f.inputs[0],f.inputs[1]);assert.equal(f.logouts(),1);}finally{await f.close();}
});
test('a failed cleanup preserves its pending request so a later run can resume safely',async()=>{
  const f=await cleanupFixture({fail:502});try{await assert.rejects(f.run,/pending request was retained/);const saved=JSON.parse(await readFile(path.join(f.directory,'v127-entry-cleanup.json'),'utf8'));assert.equal(saved.status,'pending');assert.ok(!JSON.stringify(saved).includes('private-test-password'));f.setFailure(0);await f.run();assert.equal(f.inputs.at(-1).id,saved.input.id);assert.equal(f.publishes(),1);assert.equal(f.logouts(),2);}finally{await f.close();}
});
test('a cleanup refreshes a confirmed stale head and removes only the remaining requested cards',async()=>{
  const f=await cleanupFixture({stale:true});try{await f.run();assert.equal(f.publishes(),1);assert.equal(f.inputs.length,2);assert.notEqual(f.inputs[0].id,f.inputs[1].id);assert.equal(f.inputs[1].head,'c'.repeat(40));}finally{await f.close();}
});
test('local cleanup keeps owner-edited prices and added cards, saves original files, and is idempotent',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'pet-v127-local-'));try {
    const original=legacy();original.prices.pets['gummy-bear']='42K';original.catalog.PETS.push({id:'owner-new-pet',name:'Owner New Pet',image:'assets/pets/gummy-bear.png',rarity:'Exclusive'});original.prices.pets['owner-new-pet']=0;
    const catalog=writeCatalog(original.catalog),prices='export const PRICES = '+JSON.stringify(original.prices)+';\n';await mkdir(path.join(directory,'public/data'),{recursive:true});await writeFile(path.join(directory,'public/data/catalog.js'),catalog);await writeFile(path.join(directory,'public/data/prices.js'),prices);
    assert.equal((await pruneLocalRelease(directory)).removed,9);
    const current=decodeSnapshot(await readFile(path.join(directory,'public/data/catalog.js'),'utf8'),await readFile(path.join(directory,'public/data/prices.js'),'utf8'));
    assert.equal(current.prices.pets['gummy-bear'],'42K');assert.equal(current.prices.pets['owner-new-pet'],0);assert.ok(current.catalog.PETS.some(item=>item.id==='owner-new-pet'));assert.equal(pendingReleaseRemovals(current).length,0);
    assert.equal(await readFile(path.join(directory,'.cloudflare/v127-local-data-backup/prices.js'),'utf8'),prices);assert.equal(await readFile(path.join(directory,'.cloudflare/v127-local-data-backup/catalog.js'),'utf8'),catalog);
    assert.equal((await pruneLocalRelease(directory)).removed,0);
  }finally{await rm(directory,{recursive:true,force:true});}
});

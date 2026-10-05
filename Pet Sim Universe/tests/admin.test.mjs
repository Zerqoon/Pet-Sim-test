import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {handle,passwordHash,flushNotifications} from '../admin/worker.js';
import {decodeSnapshot,editSnapshot,decodePNG} from '../admin/data.js';
import {readCatalog,writeCatalog} from '../server/catalog-data.js';
import {github} from '../admin/github.js';
import {readDataModule} from '../public/data/value-loader.js';
import {selectPriceUpdate,priceRevision} from '../public/data/price-core.js';
const catalogSource=await readFile(new URL('../public/data/catalog.js',import.meta.url),'utf8');
const priceSource=await readFile(new URL('../public/data/prices.js',import.meta.url),'utf8');
const snapshot=decodeSnapshot(catalogSource,priceSource);
const png=(await readFile(new URL('../public/assets/pets/gummy-bear.png',import.meta.url))).toString('base64');
const head='a'.repeat(40),changedHead='b'.repeat(40);
function database() {
  const sql=new DatabaseSync(':memory:');
  return {sql,prepare(text) {let args=[];const s={bind(...values){args=values;return s;},async run(){return {meta:{changes:Number(sql.prepare(text).run(...args).changes)}};},async first(){return sql.prepare(text).get(...args)||null;},async all(){return {results:sql.prepare(text).all(...args)};}};return s;},async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>s.run());sql.exec('COMMIT');return Promise.all(result);}catch(e){sql.exec('ROLLBACK');throw e;}}};
}
async function fixture() {
  const db=database(), salt='random-test-salt', password='a-long-private-test-password';
  const account={username:'Zerqoon',salt,hash:await passwordHash(password,salt)};
  const env={ADMIN_DB:db,ADMIN_USERS:JSON.stringify([account]),GITHUB_TOKEN:'private-github-token',DISCORD_WEBHOOK_URL:'https://discord.com/api/webhooks/123456789012345678/test_token'};
  let sha=head,message='',refFailure=false,discordFailure=0;const calls=[],pending=[],blobs=[];
  const fetcher=async(url,options={})=> {
    calls.push({url,options});
    if(new URL(url).hostname==='discord.com')return Response.json({}, {status:discordFailure||200});
    assert.equal(options.headers.authorization,'Bearer private-github-token');assert.equal(options.redirect,'error');
    const path=decodeURIComponent(new URL(url).pathname);const body=options.body?JSON.parse(options.body):null;
    if(path.includes('/contents/'))return Response.json({type:'file',size:30000,encoding:'base64',content:Buffer.from(path.endsWith('catalog.js')?catalogSource:priceSource).toString('base64')});
    if(path.endsWith('/git/ref/heads/main'))return Response.json({object:{sha}});
    if(path.includes('/git/commits/') && !body)return Response.json({tree:{sha:'t'.repeat(40)},message});
    if(path.endsWith('/git/blobs')){blobs.push(body);return Response.json({sha:'c'.repeat(40)});}
    if(path.endsWith('/git/trees'))return Response.json({sha:'d'.repeat(40)});
    if(path.endsWith('/git/commits')&&body){message=body.message;return Response.json({sha:changedHead});}
    if(path.endsWith('/git/refs/heads/main')){assert.equal(body.force,false);sha=changedHead;if(refFailure)throw new Error('Timeout after successful write');return Response.json({object:{sha}});}
    if(path.endsWith('/commits'))return Response.json([]);
    throw new Error('Unexpected URL: '+path);
  };
  let cookie='',csrf='';
  const request=(route,body,extra={})=>new Request('https://admin.example/api/'+route,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{origin:'https://admin.example','content-type':'application/json'}),...(cookie?{cookie}:{}),...(csrf?{'x-csrf-token':csrf}:{}),'cf-connecting-ip':'192.0.2.3',...extra},body:body===undefined?undefined:JSON.stringify(body)});
  const send=(route,body,extra)=>handle(request(route,body,extra),env,{waitUntil:p=>pending.push(p)},fetcher);
  async function login(){const r=await send('login',{username:'Zerqoon',password});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];csrf=(await r.json()).csrf;return r;}
  return {env,db,calls,blobs,send,login,request,pending,setHead:v=>sha=v,setRefFailure:()=>refFailure=true,setDiscordFailure:v=>discordFailure=v,close:async()=>{await Promise.all(pending);db.sql.close();}};
}
function edit(overrides={}) {return {category:'pets',id:'gummy-bear',metadata:{name:'Gummy Bear',rarity:'Exclusive',source:'Gummy Egg',description:'Updated description.',image:'assets/pets/gummy-bear.png'},prices:{normal:'20K'},...overrides};}

test('catalog parser preserves every export, preset and value without executing source',()=> {
  const data=readCatalog(catalogSource);assert.equal(JSON.stringify(readCatalog(writeCatalog(data))),JSON.stringify(data));
  assert.equal(data.PETS.length,35);assert.equal(data.ITEMS.length,12);
  for(const injection of ["export const PETS = globalThis.process.exit();",catalogSource+"\nfetch('https://attacker.example');",catalogSource.replace("name: 'Gummy Bear'","name: (() => 'Bad')()"),catalogSource.replace("name: 'Gummy Bear'","__proto__: 'Bad'")])assert.throws(()=>readCatalog(injection));
});
test('PNG validation rejects corruption, trailing payload and non-PNG files',()=> {
  assert.equal(decodePNG(png),png);const corrupt=Buffer.from(png,'base64');corrupt[35]^=1;
  assert.throws(()=>decodePNG(corrupt.toString('base64')));assert.throws(()=>decodePNG(Buffer.concat([Buffer.from(png,'base64'),Buffer.from('extra')]).toString('base64')));assert.throws(()=>decodePNG(Buffer.from('<svg></svg>').toString('base64')));
});
test('price edit retains unrelated entries, uses one source and records matching author time',async()=> {
  const now='2026-10-05T19:30:00.000Z';const result=await editSnapshot(snapshot,{changes:[edit()]},now);
  assert.equal(result.prices.pets['gummy-bear'],'20K');assert.equal(JSON.stringify(result.catalog.ITEMS),JSON.stringify(snapshot.catalog.ITEMS));
  assert.deepEqual(Object.keys(result.prices.pets),Object.keys(snapshot.prices.pets));
  assert.deepEqual(result.files.map(x=>x.path),['public/data/catalog.js','public/data/prices.js','public/data/price-updates.js']);
  const metadata=readDataModule(result.files[2].content,'PRICE_UPDATE');assert.equal(selectPriceUpdate(result.revision,metadata,Date.parse(now)).updatedAt,now);
  assert.equal(readDataModule(result.files[1].content,'PRICES').pets['gummy-bear'],'20K');
});
test('unknown inputs become null, zero stays priced and malformed inputs are rejected',async()=> {
  for(const value of ['???','Null','Not Price',null]){const r=await editSnapshot(snapshot,{changes:[edit({prices:{normal:value}})]});assert.equal(r.prices.pets['gummy-bear'],null);}
  const r=await editSnapshot(snapshot,{changes:[edit({prices:{normal:0}})]});assert.equal(r.prices.pets['gummy-bear'],0);
  for(const value of [-1,{},'2KK','Infinity','<script>'])await assert.rejects(()=>editSnapshot(snapshot,{changes:[edit({prices:{normal:value}})]}));
});
test('metadata-only and equivalent-price edits do not reset the price timestamp',async()=> {
  const r=await editSnapshot(snapshot,{changes:[edit({prices:{normal:18000}})]});assert.ok(!r.files.some(x=>x.path.endsWith('price-updates.js')));
  const r2=await editSnapshot(snapshot,{changes:[edit({prices:{normal:'18K'}})]});assert.ok(!r2.files.some(x=>x.path.endsWith('prices.js')));
});
test('new variants pet saves catalog, prices and matching artwork atomically',async()=> {
  const result=await editSnapshot(snapshot,{changes:[edit({id:'test-new-pet',add:true,supportsVariants:true,metadata:{name:'Test New Pet',rarity:'Exclusive',source:'Test',description:'New pet',image:''},prices:{normal:'???',golden:'Null',diamond:0},images:{normal:png,golden:png}})]});
  const item=result.catalog.PETS.find(x=>x.id==='test-new-pet');assert.equal(item.variantImages.normal,'assets/pets/test-new-pet.png');assert.equal(item.variantImages.golden,'assets/pets/test-new-pet-golden.png');assert.deepEqual(result.prices.pets['test-new-pet'],{normal:null,golden:null,diamond:0});
  assert.equal(result.files.length,5);decodeSnapshot(result.files.find(x=>x.path.endsWith('catalog.js')).content,result.files.find(x=>x.path.endsWith('prices.js')).content);
  await assert.rejects(()=>editSnapshot(snapshot,{changes:[edit({id:'../escape'})]}));
  await assert.rejects(()=>editSnapshot(snapshot,{changes:[edit(),edit()]}));
});
test('unauthenticated writes, foreign origins and missing CSRF tokens are denied',async()=> {
  const f=await fixture();try{
    assert.equal((await f.send('catalog')).status,401);assert.equal((await f.send('publish',{})).status,401);
    assert.equal((await f.send('login',{username:'Zerqoon',password:'wrong'},{origin:'https://evil.example'})).status,403);
    const login=await f.login();assert.match(login.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Strict/);
    assert.equal((await f.send('publish',{}, {'x-csrf-token':''})).status,403);assert.equal((await f.send('session')).status,200);
    assert.equal(f.calls.length,0);
  }finally{await f.close();}
});
test('incorrect logins are rate limited and secrets are never returned',async()=> {
  const f=await fixture();try{
    for(let i=0;i<10;i++)assert.equal((await f.send('login',{username:'Zerqoon',password:'wrong'})).status,401);
    const r=await f.send('login',{username:'Zerqoon',password:'wrong'});assert.equal(r.status,429);assert.ok(!(await r.text()).includes('private'));
  }finally{await f.close();}
});
test('logout, expired sessions and password replacement revoke access',async()=> {
  const f=await fixture();try{
    await f.login();await f.send('logout',{});assert.equal((await f.send('session')).status,401);
    await f.login();f.db.sql.exec('UPDATE sessions SET expires=0');assert.equal((await f.send('session')).status,401);
    await f.login();const accounts=JSON.parse(f.env.ADMIN_USERS);accounts[0].hash='new';f.env.ADMIN_USERS=JSON.stringify(accounts);assert.equal((await f.send('session')).status,401);
  }finally{await f.close();}
});
test('publish creates one commit, audit and delivery; repeat operation does not commit twice',async()=> {
  const f=await fixture();try{
    await f.login();const input={head,id:crypto.randomUUID(),changes:[edit()]};
    const response=await f.send('publish',input);assert.equal(response.status,200);const result=await response.json();assert.equal(result.sha,changedHead);
    const repeated=await f.send('publish',input);assert.equal(repeated.status,200);assert.deepEqual(await repeated.json(),result);
    assert.equal(f.calls.filter(x=>x.url.endsWith('/git/commits')).length,1);assert.equal(f.db.sql.prepare('SELECT COUNT(*) n FROM audit').get().n,1);
    await Promise.all(f.pending);assert.ok(f.db.sql.prepare('SELECT sent FROM notifications').get().sent);
    const message=JSON.parse(f.calls.find(x=>x.url.startsWith('https://discord.com')).options.body);assert.equal(message.embeds[0].title,'Catalog update saved');assert.match(message.embeds[0].footer.text,/after deployment/);
    assert.ok(f.blobs.every(x=>!x.content.includes('private-github-token')));assert.ok(!JSON.stringify(result).includes('webhook'));
  }finally{await f.close();}
});
test('stale GitHub version and concurrent publish lock block all file writes',async()=> {
  const f=await fixture();try{
    await f.login();f.setHead(changedHead);assert.equal((await f.send('publish',{head,id:crypto.randomUUID(),changes:[edit()]})).status,409);assert.equal(f.blobs.length,0);
    f.db.sql.prepare("INSERT INTO locks VALUES('publish','other',?)").run(Date.now()+100000);
    assert.equal((await f.send('publish',{head,id:crypto.randomUUID(),changes:[edit()]})).status,409);assert.equal(f.blobs.length,0);
  }finally{await f.close();}
});
test('GitHub timeout after fast-forward is recovered without duplicate publish',async()=> {
  const f=await fixture();try{await f.login();f.setRefFailure();const r=await f.send('publish',{head,id:crypto.randomUUID(),changes:[edit()]});assert.equal(r.status,200);assert.equal(f.calls.filter(x=>x.url.endsWith('/git/refs/heads/main')).length,1);}finally{await f.close();}
});
test('a successful GitHub save is recovered if audit storage fails once afterward',async()=> {
  const f=await fixture();try {
    await f.login();const batch=f.db.batch.bind(f.db);let fail=true;
    f.db.batch=async statements=>{if(fail&&statements.length===3){fail=false;throw new Error('Temporary D1 failure after commit');}return batch(statements);};
    const input={head,id:crypto.randomUUID(),changes:[edit()]};
    assert.equal((await f.send('publish',input)).status,500);
    const recovered=await f.send('publish',input);assert.equal(recovered.status,200);
    assert.equal(f.calls.filter(x=>x.url.endsWith('/git/commits')).length,1);
    assert.equal(f.db.sql.prepare('SELECT COUNT(*) n FROM audit').get().n,1);
    assert.equal((await f.send('publish',{...input,changes:[edit({prices:{normal:'21K'}})]})).status,409);
  } finally {await f.close();}
});
test('Discord failure remains queued and later delivery uses the same notification',async()=> {
  const f=await fixture();try{
    await f.login();f.setDiscordFailure(429);const r=await f.send('discord-test',{});const result=await r.json();assert.equal(result.queued,true);assert.equal(result.sent,false);
    let row=f.db.sql.prepare('SELECT * FROM notifications').get();assert.equal(row.sent,null);assert.equal(row.status,429);assert.ok(row.next_attempt>Date.now());
    f.setDiscordFailure(0);f.db.sql.exec('UPDATE notifications SET next_attempt=0');await flushNotifications(f.env,async()=>Response.json({id:'delivered'}));row=f.db.sql.prepare('SELECT * FROM notifications').get();assert.ok(row.sent);assert.equal(row.attempts,2);
  }finally{await f.close();}
});
test('GitHub writes are restricted to data files and validated asset paths',async()=> {
  const f=await fixture();try{const api=github(f.env,async(url,opts)=>f.calls.push({url,opts})&&Response.json(url.includes('ref/')?{object:{sha:head}}:{tree:{sha:head}}));await assert.rejects(()=>api.publish(head,[{path:'src/index.html',content:'bad',encoding:'utf-8'}],'Zerqoon','id'));assert.equal(f.blobs.length,0);}finally{await f.close();}
});

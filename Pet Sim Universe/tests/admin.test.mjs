import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {handle,passwordHash,flushNotifications} from '../admin/worker.js';
import {decodeSnapshot,editSnapshot,decodePNG} from '../admin/data.js';
import {readCatalog,writeCatalog,catalogGroups} from '../server/catalog-data.js';
import {github} from '../admin/github.js';
import {readDataModule,rowsFromPrices} from '../public/data/value-loader.js';
import {selectPriceUpdate,priceRevision,normalizePrice} from '../public/data/price-core.js';
import {prepareFreeAccounts,adminConfig} from '../scripts/free-admin-config.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {verifyFreeAdmin} from '../scripts/admin-deploy-check.mjs';
const catalogSource=await readFile(new URL('../public/data/catalog.js',import.meta.url),'utf8');
const priceSource=await readFile(new URL('../public/data/prices.js',import.meta.url),'utf8');
const snapshot=decodeSnapshot(catalogSource,priceSource);
const png=(await readFile(new URL('./fixtures/admin-artwork.png',import.meta.url))).toString('base64');
const head='a'.repeat(40),changedHead='b'.repeat(40);
function database() {
  const sql=new DatabaseSync(':memory:');
  return {sql,prepare(text) {let args=[];const s={bind(...values){args=values;return s;},async run(){return {meta:{changes:Number(sql.prepare(text).run(...args).changes)}};},async first(){return sql.prepare(text).get(...args)||null;},async all(){return {results:sql.prepare(text).all(...args)};}};return s;},async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>s.run());sql.exec('COMMIT');return Promise.all(result);}catch(e){sql.exec('ROLLBACK');throw e;}}};
}
async function fixture(username='Zerqoon') {
  const db=database(), salt='random-test-salt', password='a-long-private-test-password';
  const pepper='f'.repeat(64);
  const account={username,salt,scheme:'random-hmac-v1',hash:await passwordHash(password,salt,pepper)};
  const env={ADMIN_DB:db,ADMIN_USERS:JSON.stringify([account]),AUTH_PEPPER:pepper,GITHUB_TOKEN:'private-github-token',DISCORD_WEBHOOK_URL:'https://discord.com/api/webhooks/123456789012345678/value_token',ADMIN_WEBHOOK_URL:'https://discord.com/api/webhooks/987654321098765432/admin_token'};
  let sha=head,message='',refFailure=false,discordFailure=0;const calls=[],pending=[],blobs=[];
  const fetcher=async(url,options={})=> {
    calls.push({url,options});
    if(new URL(url).hostname==='discord.com'){assert.equal(new URL(url).origin+new URL(url).pathname,env.ADMIN_WEBHOOK_URL,'admin audit must use only the audit webhook');return Response.json({}, {status:discordFailure||200});}
    assert.equal(options.headers.authorization,'Bearer private-github-token');assert.equal(options.redirect,'manual');
    const path=decodeURIComponent(new URL(url).pathname);const body=options.body?JSON.parse(options.body):null;
    if(path.includes('/contents/') && options.headers.accept==='application/vnd.github.raw+json')return new Response(Buffer.from(png,'base64'),{headers:{'content-type':'application/octet-stream'}});
    if(path.includes('/contents/'))return Response.json({type:'file',size:30000,encoding:'base64',content:Buffer.from(path.endsWith('catalog.js')?catalogSource:priceSource).toString('base64')});
    if(path.endsWith('/git/ref/heads/main'))return Response.json({object:{sha}});
    if(path.includes('/git/commits/') && !body)return Response.json({tree:{sha:'t'.repeat(40)},message});
    if(path.includes('/git/trees/')&&!body)return Response.json({truncated:false,tree:Object.values(snapshot.catalog).flatMap(group=>Array.isArray(group)?group:[]).flatMap(item=>[item.image,...Object.values(item.variantImages||{})]).filter(Boolean).map(image=>({type:'blob',path:'Pet Sim Universe/public/'+image,size:123,sha:head}))});
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
  async function login(){const r=await send('login',{username,password});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];csrf=(await r.json()).csrf;return r;}
  return {env,db,calls,blobs,send,login,request,pending,fetcher,setHead:v=>sha=v,setRefFailure:()=>refFailure=true,setDiscordFailure:v=>discordFailure=v,close:async()=>{await Promise.all(pending);db.sql.close();}};
}
function edit(overrides={}) {return {category:'pets',id:'gummy-bear',metadata:{name:'Gummy Bear',rarity:'Exclusive',source:'Gummy Egg',description:'Updated description.',image:'assets/pets/gummy-bear.png'},prices:{normal:'20K'},...overrides};}

test('GitHub requests use a Workers-supported redirect mode and reject redirects without forwarding credentials',async()=> {
  let calls=0;
  const api=github({GITHUB_TOKEN:'private-github-token'},async(url,options)=> {
    calls++;
    if(!['manual','follow'].includes(options.redirect))throw new TypeError('Invalid redirect value');
    assert.equal(options.redirect,'manual');
    return new Response(null,{status:302,headers:{location:'https://other.example/private'}});
  });
  await assert.rejects(()=>api.head(),error=>error.status===502 && /redirect/.test(error.message));
  assert.equal(calls,1,'no second request may receive the GitHub credential');
});

test('catalog parser preserves every export, preset and value without executing source',()=> {
  const data=readCatalog(catalogSource);assert.equal(JSON.stringify(readCatalog(writeCatalog(data))),JSON.stringify(data));
  assert.equal(data.PETS.length,32);assert.equal(data.ITEMS.length,8);
  for(const injection of ["export const PETS = globalThis.process.exit();",catalogSource+"\nfetch('https://attacker.example');",catalogSource.replace('"name": "Gummy Bear"','"name": (() => "Bad")()'),catalogSource.replace('"name": "Gummy Bear"','"__proto__": "Bad"')])assert.throws(()=>readCatalog(injection));
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
  const current=normalizePrice(snapshot.prices.pets['gummy-bear']);
  const r=await editSnapshot(snapshot,{changes:[edit({prices:{normal:current.number}})]});assert.ok(!r.files.some(x=>x.path.endsWith('price-updates.js')));
  const r2=await editSnapshot(snapshot,{changes:[edit({prices:{normal:current.label}})]});assert.ok(!r2.files.some(x=>x.path.endsWith('prices.js')));
});
test('every Fishing Charm with spaces in its filename remains editable without changing prices or paths',async()=> {
  const charms=snapshot.catalog.CHARMS.filter(item=>/^fishing-charm-/.test(item.id));assert.equal(charms.length,1);
  const changes=charms.map(item=>({category:'charms',id:item.id,metadata:{name:item.name,image:item.image,description:item.description+' Updated.'},prices:{normal:snapshot.prices.charms[item.id]}}));
  const result=await editSnapshot(snapshot,{changes});
  for(const item of charms)assert.equal(result.catalog.CHARMS.find(value=>value.id===item.id).image,item.image);
  assert.deepEqual(result.prices,structuredClone(snapshot.prices));assert.deepEqual(result.files.map(file=>file.path),['public/data/catalog.js']);
});
test('pets with artwork only in variantImages.normal can be edited without uploading a second image',async()=> {
  const variantOnly=structuredClone(snapshot);
  for(const item of variantOnly.catalog.PETS)if(item.supportsVariants&&item.variantImages?.normal)delete item.image;
  const pets=variantOnly.catalog.PETS.filter(item=>!item.image && item.variantImages?.normal);assert.ok(pets.length>0);
  const changes=pets.map(item=>({category:'pets',id:item.id,metadata:{description:item.description+' Updated.'},prices:snapshot.prices.pets[item.id]}));
  const result=await editSnapshot(variantOnly,{changes});
  for(const item of pets)assert.deepEqual(result.catalog.PETS.find(value=>value.id===item.id).variantImages,structuredClone(item.variantImages));
  assert.equal(result.revision,await priceRevision(rowsFromPrices(catalogGroups(snapshot.catalog),snapshot.prices)));
  assert.ok(!result.files.some(file=>file.path.endsWith('price-updates.js')),'Normalizing an unpriced spelling must not reset the price timestamp');
});
test('new variants pet saves catalog, prices and matching artwork atomically',async()=> {
  const result=await editSnapshot(snapshot,{changes:[edit({id:'test-new-pet',add:true,supportsVariants:true,metadata:{name:'Test New Pet',rarity:'Exclusive',source:'Test',description:'New pet',image:''},prices:{normal:'???',golden:'Null',diamond:0},artwork:{normal:'upload-normal',golden:'upload-golden'}})]},undefined,new Map([['upload-normal','c'.repeat(40)],['upload-golden','d'.repeat(40)]]));
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
    const message=JSON.parse(f.calls.find(x=>x.url.startsWith('https://discord.com')).options.body);assert.equal(message.embeds[0].title,'GitHub updated');assert.match(message.embeds[0].description,/Updated by Zerqoon/);assert.match(message.embeds[0].footer.text,/petuniverse-values/);
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

test('Free deployment removes paid-only overrides and migrates existing random logins unchanged',async()=> {
  const directory=await mkdtemp(path.join(tmpdir(),'pet-free-accounts-'));
  try {
    const logins='PRIVATE\nZerqoon: ABCDEFGHIJKLMNOPQRSTUVWX\nPioterek: 0123456789abcdefghijklmn\n';
    await writeFile(path.join(directory,'LOGIN.private.txt'),logins);
    await writeFile(path.join(directory,'admin-secrets.private.json'),JSON.stringify({ADMIN_USERS:JSON.stringify([{username:'Zerqoon',salt:'old-salt',hash:'legacy'}]),DISCORD_WEBHOOK_URL:'test'}));
    const first=await prepareFreeAccounts(directory),second=await prepareFreeAccounts(directory);
    assert.deepEqual(first,second);assert.equal(await readFile(path.join(directory,'LOGIN.private.txt'),'utf8'),logins);
    for(const user of JSON.parse(first.ADMIN_USERS))assert.equal(user.hash,await passwordHash(logins.split('\n').find(x=>x.startsWith(user.username+': ')).split(': ')[1],user.salt,first.AUTH_PEPPER));
    const config=adminConfig({accountId:'a'.repeat(32),databaseId:'db-id'});assert.equal(config.limits,undefined);assert.equal(config.d1_databases[0].database_id,'db-id');
    assert.equal(config.assets.run_worker_first,true);
    await writeFile(path.join(directory,'LOGIN.private.txt'),'Zerqoon: password123\nPioterek: 0123456789abcdefghijklmn\n');
    await assert.rejects(()=>prepareFreeAccounts(directory),/generated 24-character/);
  } finally {await rm(directory,{recursive:true,force:true});}
});

test('artwork staging is idempotent and never publishes a branch before review',async()=> {
  const f=await fixture();try {
    await f.login();const id=crypto.randomUUID();
    assert.equal((await f.send('artwork',{id,content:png})).status,200);
    assert.equal((await f.send('artwork',{id,content:png})).status,200);
    assert.equal(f.blobs.length,1);assert.equal(f.calls.filter(x=>x.url.endsWith('/git/refs/heads/main')).length,0);
    const input={head,id:crypto.randomUUID(),changes:[edit({id:'free-upload-pet',add:true,metadata:{name:'Free Upload Pet',rarity:'Exclusive',source:'Test',description:'Test',image:''},prices:{normal:'Null'},artwork:{normal:id}})]};
    const publish=await f.send('publish',input);assert.equal(publish.status,200);
    const tree=JSON.parse(f.calls.find(x=>x.url.endsWith('/git/trees')).options.body);
    assert.deepEqual(tree.tree.find(x=>x.path.endsWith('free-upload-pet.png')),{path:'Pet Sim Universe/public/assets/pets/free-upload-pet.png',mode:'100644',type:'blob',sha:'c'.repeat(40)});
    assert.equal(f.blobs.length,4,'one staged PNG plus catalog, prices and timestamp; publishing does not re-upload PNG');
    assert.equal(f.calls.filter(x=>x.url.endsWith('/git/refs/heads/main')).length,1);
  } finally {await f.close();}
});

test('expired, missing or another account artwork cannot enter a publish',async()=> {
  const f=await fixture();try {
    await f.login();const id=crypto.randomUUID();await f.send('artwork',{id,content:png});
    const input=()=>({head,id:crypto.randomUUID(),changes:[edit({artwork:{normal:id}})]});
    f.db.sql.prepare('UPDATE artwork_uploads SET username=?').run('Pioterek');
    assert.equal((await f.send('publish',input())).status,400);assert.equal((await f.send('artwork',{id,content:png})).status,409);
    f.db.sql.exec("UPDATE artwork_uploads SET username='Zerqoon',expires=0");
    assert.equal((await f.send('publish',input())).status,400);
    assert.equal(f.calls.filter(x=>x.url.endsWith('/git/refs/heads/main')).length,0);
    assert.equal((await f.send('publish',{head,id:crypto.randomUUID(),changes:[edit({images:{normal:png}})]})).status,400);
  } finally {await f.close();}
});

test('invalid or oversized artwork fails before GitHub; server key is never returned',async()=> {
  const f=await fixture();try {
    await f.login();assert.equal((await f.send('artwork',{id:crypto.randomUUID(),content:Buffer.from('not a PNG').toString('base64')})).status,400);
    assert.equal((await f.send('artwork',{id:crypto.randomUUID(),content:'A'.repeat(200000)})).status,413);
    assert.equal(f.calls.length,0);
    assert.ok(!(await (await f.send('session')).text()).includes(f.env.AUTH_PEPPER));
    f.env.AUTH_PEPPER='e'.repeat(64);assert.equal((await f.send('login',{username:'Zerqoon',password:'a-long-private-test-password'})).status,401);
  } finally {await f.close();}
});

test('deployment verifies the actual Free login and catalog then revokes its setup session',async()=> {
  const f=await fixture();try {
    const result=await verifyFreeAdmin('https://admin.example',{username:'Zerqoon',password:'a-long-private-test-password'},{fetcher:(url,options)=>handle(new Request(url,options),f.env,{waitUntil:p=>f.pending.push(p)},f.fetcher)});
    assert.equal(result.confirmed,true);assert.equal(result.petCount,32);assert.equal(result.imageConfirmed,true);
    const paths=['PETS','CHARMS','EGGS','ITEMS'].flatMap(key=>snapshot.catalog[key]).map(item=>item.image||item.variantImages?.normal).filter(Boolean);
    const chosen=paths.find(path=>path.includes(' '))||paths[0];
    const encoded=chosen.split('/').map(encodeURIComponent).join('/');
    assert.ok(f.calls.some(call=>call.url.includes(encoded) && call.options.headers.accept==='application/vnd.github.raw+json'));
    assert.equal(f.db.sql.prepare('SELECT COUNT(*) n FROM sessions').get().n,0);
    assert.equal(f.calls.filter(x=>x.url.startsWith('https://discord.com')).length,0);
    assert.equal(f.calls.filter(x=>x.options.method==='POST').length,0,'setup check never changes repository contents');
  } finally {await f.close();}
});
test('deployment rejects broken image delivery and still closes its temporary session',async()=> {
  const f=await fixture();try {
    await assert.rejects(()=>verifyFreeAdmin('https://admin.example',{username:'Zerqoon',password:'a-long-private-test-password'},{fetcher:(url,options)=>new URL(url).pathname==='/api/image'?Response.json({error:'Not found'},{status:502}):handle(new Request(url,options),f.env,{waitUntil:p=>f.pending.push(p)},f.fetcher)}),/Image check failed/);
    assert.equal(f.db.sql.prepare('SELECT COUNT(*) n FROM sessions').get().n,0);
  } finally {await f.close();}
});
test('repository PNG fallback requires login, uses the exact commit and never exposes credentials',async()=> {
  const f=await fixture(),route='image?'+new URLSearchParams({path:'assets/items/FishingCharm I.png',ref:head});try {
    assert.equal((await f.send(route)).status,401);assert.equal(f.calls.length,0);
    await f.login();const response=await f.send(route);
    assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.match(response.headers.get('cache-control'),/^private,/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from(png,'base64'));
    const call=f.calls.at(-1);assert.match(call.url,/FishingCharm%20I\.png/);assert.equal(new URL(call.url).searchParams.get('ref'),head);
    assert.ok(!JSON.stringify([...response.headers]).includes(f.env.GITHUB_TOKEN));
    const before=f.calls.length;
    for(const path of ['assets/items/../prices.png','assets/items/foo.png?secret','https://other.example/image.png'])assert.equal((await f.send('image?'+new URLSearchParams({path,ref:head}))).status,400);
    assert.equal((await f.send('image?'+new URLSearchParams({path:'assets/items/worm.png',ref:'main'}))).status,400);assert.equal(f.calls.length,before);
  } finally {await f.close();}
});
test('existing images with spaces pass GitHub metadata validation and publish atomically',async()=> {
  const f=await fixture();try {
    const api=github(f.env,f.fetcher);await api.assertAsset('assets/items/FishingCharm II.png',head);
    assert.match(f.calls.at(-1).url,/FishingCharm%20II\.png/);
    await f.login();const result=await f.send('publish',{head,id:crypto.randomUUID(),changes:[edit({metadata:{name:'Gummy Bear',image:'assets/items/FishingCharm II.png'}})]});
    assert.equal(result.status,200);assert.equal(f.calls.filter(call=>call.url.endsWith('/git/commits')).length,1);
  } finally {await f.close();}
});

test('activation timeout stops before sending any login credentials',async()=> {
  let time=0,logins=0;
  await assert.rejects(()=>verifyFreeAdmin('https://admin.example',{username:'Zerqoon',password:'private'},{clock:()=>time,timeout:10,delay:5,wait:async()=>{time+=5;},fetcher:async(url,options)=>{if(options.method==='POST')logins++;return Response.json({ready:false,version:122});}}),/not confirmed/);
  assert.equal(logins,0);
});


test('Pioterek saves are attributed to Pioterek and sent only to the separate GitHub audit webhook',async()=> {
  const f=await fixture('Pioterek');try {
    await f.login();const response=await f.send('publish',{head,id:crypto.randomUUID(),changes:[edit()]});assert.equal(response.status,200);
    await Promise.all(f.pending);const notification=f.calls.find(x=>x.url.startsWith('https://discord.com'));
    assert.match(JSON.parse(notification.options.body).embeds[0].description,/Updated by Pioterek/);
    assert.equal(new URL(notification.url).pathname,new URL(f.env.ADMIN_WEBHOOK_URL).pathname);
    assert.ok(!f.calls.some(x=>x.url.includes('/value_token')));
  }finally{await f.close();}
});

test('missing admin audit configuration never falls back to the value webhook',async()=> {
  const f=await fixture();try{delete f.env.ADMIN_WEBHOOK_URL;assert.equal((await f.send('ready')).status,503);await flushNotifications(f.env,f.fetcher);assert.equal(f.calls.length,0);}finally{await f.close();}
});

test('custom admin domain uses only its own hostname and retains the workers.dev fallback',()=> {
  const config=adminConfig({accountId:'account',databaseId:'database',domain:'admin.petuniverse-values.pl'});
  assert.deepEqual(config.routes,[{pattern:'admin.petuniverse-values.pl',custom_domain:true}]);assert.equal(config.workers_dev,true);assert.equal(config.limits,undefined);
});

test('authenticated removal creates one commit and one attributed audit without deleting image blobs',async()=> {
  const f=await fixture('Pioterek');try {
    const input={head,id:crypto.randomUUID(),changes:[{category:'pets',id:'queen-bee',action:'delete'},{category:'items',id:'golden-fish-hook',action:'delete'}]};
    assert.equal((await f.send('publish',input)).status,401);await f.login();
    assert.equal((await f.send('publish',input,{'x-csrf-token':''})).status,403);assert.equal(f.blobs.length,0);
    const response=await f.send('publish',input);assert.equal(response.status,200);const result=await response.json();assert.deepEqual(result.summary,['Removed Queen Bee','Removed Golden Fish Hook']);
    const savedPrices=readDataModule(f.blobs.find(blob=>blob.encoding==='utf-8' && /export const PRICES/.test(blob.content)).content,'PRICES');
    assert.equal(Object.hasOwn(savedPrices.pets,'queen-bee'),false);assert.equal(Object.hasOwn(savedPrices.items,'golden-fish-hook'),false);assert.equal(savedPrices.pets['gummy-bear'],snapshot.prices.pets['gummy-bear']);
    const tree=JSON.parse(f.calls.find(call=>call.url.endsWith('/git/trees')).options.body);assert.ok(tree.tree.every(file=>file.path.includes('/public/data/') && file.sha));
    assert.equal((await f.send('publish',input)).status,200);assert.equal(f.calls.filter(call=>call.url.endsWith('/git/commits')).length,1);
    await Promise.all(f.pending);const message=JSON.parse(f.calls.find(call=>call.url.startsWith('https://discord.com')).options.body);assert.match(message.embeds[0].description,/Updated by Pioterek/);assert.match(message.embeds[0].description,/Removed Queen Bee/);
  }finally{await f.close();}
});
test('a stale removal or mixed invalid batch makes no GitHub file writes',async()=> {
  const f=await fixture();try {
    await f.login();const input={head,id:crypto.randomUUID(),changes:[edit(),{category:'items',id:'does-not-exist',action:'delete'}]};
    assert.equal((await f.send('publish',input)).status,409);assert.equal(f.blobs.length,0);
    f.setHead(changedHead);assert.equal((await f.send('publish',{...input,changes:[{category:'pets',id:'queen-bee',action:'delete'}]})).status,409);assert.equal(f.blobs.length,0);
  }finally{await f.close();}
});

test('asset library and publication checks require an authenticated session',async()=>{
  const f=await fixture();try{assert.equal((await f.send('assets?ref='+head)).status,401);assert.equal((await f.send('publication?sha='+head)).status,401);assert.equal(f.calls.length,0);await f.login();assert.equal((await f.send('assets?ref=main')).status,400);assert.equal((await f.send('publication?sha=main')).status,400);assert.equal((await f.send('publication?sha='+head)).status,404);}finally{await f.close();}
});
test('publication history returns structured details without stored raw operation requests',async()=>{
  const f=await fixture();try{await f.login();const result=await f.send('publish',{head,id:crypto.randomUUID(),changes:[edit()]});assert.equal(result.status,200);const activity=await(await f.send('activity')).json();assert.equal(activity.entries[0].details[0].prices[0].after,'20K');assert.equal(activity.entries[0].tracked,true);assert.equal(activity.entries[0].result,undefined);assert.ok(!JSON.stringify(activity).includes('private-github-token'));}finally{await f.close();}
});
test('multiple gallery choices use one inventory lookup and an atomic save',async()=>{
  const f=await fixture();try{await f.login();const pets=snapshot.catalog.PETS.filter(item=>!item.supportsVariants&&item.image).slice(0,5);assert.equal(pets.length,5);const changes=pets.map((item,index)=>({category:'pets',id:item.id,metadata:{},assetPaths:{normal:pets[(index+1)%pets.length].image},prices:{normal:snapshot.prices.pets[item.id]}}));const result=await f.send('publish',{head,id:crypto.randomUUID(),changes});assert.equal(result.status,200);assert.equal(f.calls.filter(call=>call.url.includes('/git/trees/')&&call.options.method==='GET').length,1);assert.equal(f.calls.filter(call=>call.url.includes('/contents/')&&/\.png(?:\?|$)/i.test(call.url)).length,0);assert.equal(f.calls.filter(call=>call.url.endsWith('/git/commits')).length,1);}finally{await f.close();}
});
test('a missing PNG in a larger gallery batch fails before the repository is changed',async()=>{
  const f=await fixture();try{await f.login();const pets=snapshot.catalog.PETS.filter(item=>!item.supportsVariants&&item.image).slice(0,5),changes=pets.map((item,index)=>({category:'pets',id:item.id,metadata:{},assetPaths:{normal:index===0?'assets/pets/nonexistent-pet.png':pets[(index+1)%pets.length].image},prices:{normal:snapshot.prices.pets[item.id]}}));assert.equal((await f.send('publish',{head,id:crypto.randomUUID(),changes})).status,400);assert.equal(f.calls.filter(call=>call.options.method==='POST').length,0);}finally{await f.close();}
});

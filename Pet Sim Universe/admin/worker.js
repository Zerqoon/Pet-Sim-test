import {Problem,editSnapshot,decodePNG} from './data.js';
import {passwordHash} from './auth.js';
export {passwordHash} from './auth.js';
import {github} from './github.js';
import {discordUrl} from '../server/pricing.js';
import {sendDiscord} from '../workers/discord-delivery.js';

export const SCHEMA=[
  'CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, username TEXT NOT NULL, csrf TEXT NOT NULL, version TEXT NOT NULL, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, username TEXT NOT NULL, status TEXT NOT NULL, result TEXT NOT NULL, created INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, username TEXT NOT NULL, summary TEXT NOT NULL, sha TEXT NOT NULL, created INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, payload TEXT NOT NULL, sent INTEGER, next_attempt INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, status INTEGER)',
  'CREATE TABLE IF NOT EXISTS artwork_uploads (id TEXT PRIMARY KEY, username TEXT NOT NULL, sha TEXT NOT NULL, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS locks (name TEXT PRIMARY KEY, token TEXT NOT NULL, expires INTEGER NOT NULL)',
];
const encoder=new TextEncoder();
export const random=()=> [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
export const digest=async value=> [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const equal=(a,b)=> {if(typeof a!=='string' || typeof b!=='string' || a.length!==b.length) return false; let d=0; for(let i=0;i<a.length;i++) d |= a.charCodeAt(i)^b.charCodeAt(i); return d===0;};
const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'DENY','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://petuniverse-values.pl; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'strict-transport-security':'max-age=31536000'};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,'content-type':'application/json',...extra}});
async function init(db) {await db.batch(SCHEMA.map(sql=>db.prepare(sql)));}
async function body(request,limit=150000) {
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new Problem(415,'JSON is required.');
  const reader=request.body?.getReader(); if(!reader) throw new Problem(400,'Request body is missing.');
  let size=0, chunks=[];
  while(true) {const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>limit) {await reader.cancel(); throw new Problem(413,'The upload is too large.');} chunks.push(value);}
  const bytes=new Uint8Array(size); let p=0; for(const chunk of chunks) {bytes.set(chunk,p); p+=chunk.length;}
  try {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));} catch {throw new Problem(400,'Invalid JSON.');}
}
async function session(request,db,env) {
  const token=request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-pu_admin=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!token) throw new Problem(401,'Please sign in.');
  const saved=await db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').bind(await digest(token),Date.now()).first();
  if(!saved) throw new Problem(401,'Your session expired. Please sign in.');
  const account=JSON.parse(env.ADMIN_USERS).find(x=>x.username===saved.username);
  if(!account || !equal(saved.version,await digest(account.hash))) throw new Problem(401,'Your credentials changed. Please sign in again.');
  return saved;
}
async function rate(db,key,max=10) {
  const now=Date.now(); const row=await db.prepare('INSERT INTO login_limits(key,attempts,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires<? THEN 1 ELSE attempts+1 END, expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING attempts').bind(key,now+900000,now,now).first();
  if(row.attempts>max) throw new Problem(429,'Too many attempts. Try again in 15 minutes.');
}
export async function flushNotifications(env,fetcher=fetch) {
  if(!env.ADMIN_DB || !env.DISCORD_WEBHOOK_URL) return;
  const db=env.ADMIN_DB; await init(db); const token=random(),now=Date.now();
  const lock=await db.prepare("INSERT INTO locks(name,token,expires) VALUES('delivery',?,?) ON CONFLICT(name) DO UPDATE SET token=excluded.token,expires=excluded.expires WHERE expires<?").bind(token,now+60000,now).run();
  if(!lock.meta?.changes) return;
  try {
    const entries=await db.prepare('SELECT * FROM notifications WHERE sent IS NULL AND next_attempt<=? ORDER BY rowid LIMIT 3').bind(now).all();
    for(const row of entries.results) {
      const result=await sendDiscord(fetcher,discordUrl(env.DISCORD_WEBHOOK_URL).href,JSON.parse(row.payload));
      await db.prepare('UPDATE notifications SET sent=?,attempts=attempts+1,next_attempt=?,status=? WHERE id=?').bind(result.ok?Date.now():null,Date.now()+Math.max(result.retryMs,Math.min(3600000,60000*2**Math.min(row.attempts,6))),result.status,row.id).run();
      if(result.status===429 || !result.ok) break;
    }
  } finally {await db.prepare("DELETE FROM locks WHERE name='delivery' AND token=?").bind(token).run();}
}
async function complete(db,id,user,result) {
  const payload={username:'Pet Universe Values',allowed_mentions:{parse:[]},embeds:[{title:'Catalog update saved',description:result.summary.slice(0,20).map(s=>'• '+s.replace(/[\\*_~`|<>@]/g,'')).join('\n')+(result.summary.length>20?`\n+ ${result.summary.length-20} more changes`:''),url:result.url,color:0xa66bff,footer:{text:`By ${user} • Website updates after deployment`},timestamp:new Date(result.created).toISOString()}]};
  await db.batch([
    db.prepare("UPDATE operations SET status='done',result=? WHERE id=?").bind(JSON.stringify(result),id),
    db.prepare('INSERT OR IGNORE INTO audit(id,username,summary,sha,created) VALUES(?,?,?,?,?)').bind(id,user,JSON.stringify(result.summary),result.sha,result.created),
    db.prepare('INSERT OR IGNORE INTO notifications(id,payload) VALUES(?,?)').bind(id,JSON.stringify(payload)),
  ]);
}
export async function handle(request,env,ctx={waitUntil:()=>{}},fetcher=fetch) {
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/')) {
    if(!env.ASSETS) return new Response('Admin assets are not configured.',{status:503});
    const response=await env.ASSETS.fetch(request), h=new Headers(response.headers); for(const [k,v] of Object.entries(headers)) h.set(k,v); return new Response(response.body,{status:response.status,headers:h});
  }
  try {
    if(!env.ADMIN_DB || !env.ADMIN_USERS || !env.AUTH_PEPPER) throw new Problem(503,'Admin setup is incomplete.');
    const db=env.ADMIN_DB; await init(db);
    if(url.pathname==='/api/ready' && request.method==='GET') {
      const accounts=JSON.parse(env.ADMIN_USERS);
      if(!env.GITHUB_TOKEN || !env.DISCORD_WEBHOOK_URL || !accounts.length || accounts.some(x=>x.scheme!=='random-hmac-v1')) throw new Problem(503,'Free admin secrets are not active yet.');
      return json({ready:true,version:123,hosting:'free'});
    }
    if(request.method!=='GET') {
      if(request.method!=='POST') throw new Problem(405,'Method is not allowed.');
      if(request.headers.get('origin')!==url.origin) throw new Problem(403,'Invalid request origin.');
    }
    if(url.pathname==='/api/login' && request.method==='POST') {
      const input=await body(request,2000);
      const username=typeof input.username==='string'?input.username.trim().toLowerCase():'';
      if(!['zerqoon','pioterek'].includes(username) || typeof input.password!=='string' || input.password.length>200) {await rate(db,'ip:'+await digest(request.headers.get('cf-connecting-ip')||'unknown')); throw new Problem(401,'Incorrect username or password.');}
      await rate(db,'ip:'+await digest(request.headers.get('cf-connecting-ip')||'unknown')); await rate(db,'user:'+username);
      const users=JSON.parse(env.ADMIN_USERS),user=users.find(x=>x.username.toLowerCase()===username);
      if(user && user.scheme!=='random-hmac-v1') throw new Problem(503,'Run the new Free admin setup to update account verification.');
      const hash=await passwordHash(input.password,user?.salt||'unavailable',env.AUTH_PEPPER);
      if(!user || !equal(hash,user.hash)) throw new Problem(401,'Incorrect username or password.');
      const token=random(),csrf=random(),expires=Date.now()+8*3600000;
      await db.batch([db.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),db.prepare('DELETE FROM login_limits WHERE key=?').bind('user:'+username),db.prepare('INSERT INTO sessions(token,username,csrf,version,expires) VALUES(?,?,?,?,?)').bind(await digest(token),user.username,csrf,await digest(user.hash),expires)]);
      return json({username:user.username,csrf,expires},200,{'set-cookie':`__Host-pu_admin=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=28800`});
    }
    const user=await session(request,db,env);
    if(request.method==='POST' && !equal(request.headers.get('x-csrf-token'),user.csrf)) throw new Problem(403,'Invalid session request. Reload the panel.');
    if(url.pathname==='/api/session' && request.method==='GET') return json({username:user.username,csrf:user.csrf,expires:user.expires,site:env.SITE_URL||'https://petuniverse-values.pl'});
    if(url.pathname==='/api/logout' && request.method==='POST') {await db.prepare('DELETE FROM sessions WHERE token=?').bind(user.token).run(); return json({ok:true},200,{'set-cookie':'__Host-pu_admin=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0'});}
    if(url.pathname==='/api/catalog' && request.method==='GET') return json(await github(env,fetcher).snapshot());
    if(url.pathname==='/api/artwork' && request.method==='POST') {
      const input=await body(request,180000);
      if(!/^[0-9a-f-]{36}$/.test(input.id||'')) throw new Problem(400,'Invalid artwork upload.');
      const old=await db.prepare('SELECT * FROM artwork_uploads WHERE id=?').bind(input.id).first();
      if(old) {
        if(old.username!==user.username || old.expires<Date.now()) throw new Problem(409,'This artwork upload expired or belongs to another account.');
        return json({id:old.id,sha:old.sha});
      }
      await rate(db,'artwork:'+user.username,120);
      const content=decodePNG(input.content),blob=await github(env,fetcher).upload(content);
      if(!/^[a-f0-9]{40}$/.test(blob.sha||'')) throw new Problem(502,'GitHub did not confirm artwork storage.');
      await db.batch([db.prepare('DELETE FROM artwork_uploads WHERE expires<?').bind(Date.now()),db.prepare('INSERT INTO artwork_uploads(id,username,sha,expires) VALUES(?,?,?,?)').bind(input.id,user.username,blob.sha,Date.now()+86400000)]);
      return json({id:input.id,sha:blob.sha});
    }
    if(url.pathname==='/api/activity' && request.method==='GET') {
      const rows=await db.prepare('SELECT a.*,n.sent,n.status,n.attempts FROM audit a LEFT JOIN notifications n ON n.id=a.id ORDER BY a.created DESC LIMIT 30').all();
      return json({entries:rows.results});
    }
    if(url.pathname==='/api/discord-test' && request.method==='POST') {
      await rate(db,'discord-test:'+user.username);
      const id=crypto.randomUUID(), payload={username:'Pet Universe Values',allowed_mentions:{parse:[]},embeds:[{title:'Connection ready',description:'Admin notifications are connected. Value changes will arrive after the website deploys.',color:0x5de2ae,timestamp:new Date().toISOString()}]};
      await db.prepare('INSERT INTO notifications(id,payload) VALUES(?,?)').bind(id,JSON.stringify(payload)).run();
      await flushNotifications(env,fetcher);
      const sent=await db.prepare('SELECT sent,status FROM notifications WHERE id=?').bind(id).first();
      return json({sent:!!sent.sent,status:sent.status,queued:!sent.sent});
    }
    if(url.pathname==='/api/publish' && request.method==='POST') {
      const input=await body(request);
      if(!Array.isArray(input.changes) || !input.changes.length || input.changes.length>20 || input.changes.some(x=>!x || typeof x!=='object' || Array.isArray(x))) throw new Problem(400,'Publish between 1 and 20 valid changes.');
      if(!/^[0-9a-f-]{36}$/.test(input.id||'') || !/^[a-f0-9]{40}$/.test(input.head||'')) throw new Problem(400,'Invalid publish request.');
      const lockToken=random(), now=Date.now();
      const lock=await db.prepare("INSERT INTO locks(name,token,expires) VALUES('publish',?,?) ON CONFLICT(name) DO UPDATE SET token=excluded.token,expires=excluded.expires WHERE expires<?").bind(lockToken,now+240000,now).run();
      if(!lock.meta?.changes) throw new Problem(409,'A publish is in progress. Wait and retry.');
      try {
        const api=github(env,fetcher);
        const requestHash=await digest(JSON.stringify({head:input.head,changes:input.changes}));
        const operation=await db.prepare('SELECT * FROM operations WHERE id=?').bind(input.id).first();
        if(operation) {
          if(operation.username!==user.username) throw new Problem(409,'Invalid operation owner.');
          if(JSON.parse(operation.result).requestHash!==requestHash) throw new Problem(409,'This publish identifier belongs to different edits. Reload and review.');
          if(operation.status==='done') return json(JSON.parse(operation.result));
          const head=await api.head(),commit=await api.request('git/commits/'+head);
          if(commit.message.includes('Admin operation: '+input.id)) {const result={...JSON.parse(operation.result),sha:head,url:`https://github.com/${env.GITHUB_REPO||'Zerqoon/Pet-Sim-test'}/commit/${head}`};await complete(db,input.id,user.username,result);ctx.waitUntil(flushNotifications(env,fetcher));return json(result);}
          // Check recent history as another publish may follow a timed-out save.
          const recent=await api.request('commits?per_page=30&sha='+encodeURIComponent(env.GITHUB_BRANCH||'main'));
          const recovered=recent.find(x=>x.commit.message.includes('Admin operation: '+input.id));
          if(recovered) {const result={...JSON.parse(operation.result),sha:recovered.sha,url:recovered.html_url};await complete(db,input.id,user.username,result);ctx.waitUntil(flushNotifications(env,fetcher));return json(result);}
        }
        const snapshot=await api.snapshot(); if(snapshot.head!==input.head) throw new Problem(409,'The repository changed. Reload and review your edits.');
        const uploadIds=[...new Set((input.changes||[]).flatMap(change=>Object.values(change.artwork||{})))];
        if(uploadIds.length>6) throw new Problem(400,'Publish at most six artwork uploads at a time.');
        const staged=new Map();
        if(uploadIds.length) {
          const records=await db.prepare('SELECT id,sha FROM artwork_uploads WHERE username=? AND expires>? AND id IN (SELECT value FROM json_each(?))').bind(user.username,Date.now(),JSON.stringify(uploadIds)).all();
          for(const row of records.results) staged.set(row.id,row.sha);
        }
        const edited=await editSnapshot(snapshot,input,undefined,staged);
        const uploads=new Set(edited.files.map(x=>x.path));
        for(const change of input.changes) {
          if(change.category==='codes') continue;
          const item=edited.catalog[{pets:'PETS',charms:'CHARMS',eggs:'EGGS',items:'ITEMS'}[change.category]].find(x=>x.id===change.id);
          const old=snapshot.catalog[{pets:'PETS',charms:'CHARMS',eggs:'EGGS',items:'ITEMS'}[change.category]].find(x=>x.id===change.id);
          if(item.image!==old?.image && !uploads.has('public/'+item.image)) await api.assertAsset(item.image,snapshot.head);
        }
        const planned={summary:edited.summary,revision:edited.revision,requestHash,created:Date.now()};
        if(!operation) await db.prepare("INSERT INTO operations(id,username,status,result,created) VALUES(?,?,'pending',?,?)").bind(input.id,user.username,JSON.stringify(planned),planned.created).run();
        const published=await api.publish(snapshot.head,edited.files,user.username,input.id);
        const result={...planned,...published}; await complete(db,input.id,user.username,result);
        ctx.waitUntil(flushNotifications(env,fetcher)); return json(result);
      } finally {await db.prepare("DELETE FROM locks WHERE name='publish' AND token=?").bind(lockToken).run();}
    }
    throw new Problem(404,'This endpoint does not exist.');
  } catch(error) {return json({error:error instanceof Problem?error.message:'The operation failed. Reload before retrying.'},error instanceof Problem?error.status:500);}
}
export default {fetch:handle,async scheduled(_controller,env,ctx) {ctx.waitUntil(flushNotifications(env));}};

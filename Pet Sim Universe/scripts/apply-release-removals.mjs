import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {pendingReleaseRemovals,releaseRemovals} from './release-removals.mjs';
import {pause} from './discord-tools.mjs';

export async function applyReleaseRemovals(url,{username,password},{configDirectory,fetcher=fetch,wait=pause}={}) {
  if(!configDirectory)throw new Error('A local configuration directory is required for safe cleanup retries.');
  const origin=new URL(url).origin,checkpoint=path.join(configDirectory,'v127-entry-cleanup.json');
  let saved;
  try{saved=JSON.parse(await readFile(checkpoint,'utf8'));}catch(error){if(error.code!=='ENOENT')throw new Error('The v127 cleanup checkpoint is unreadable. Keep it for recovery; no new cleanup was started.');}
  if(saved?.status==='done')return {confirmed:true,alreadyApplied:true,removed:saved.removed||[],sha:saved.sha};
  if(saved && (saved.version!==127 || saved.origin!==origin || !/^[a-f0-9-]{36}$/.test(saved.input?.id||'') || !/^[a-f0-9]{40}$/.test(saved.input?.head||'') || !Array.isArray(saved.input?.changes) || saved.input.changes.length>9 || saved.input.changes.some(change=>change.action!=='delete' || Object.keys(change).some(key=>!['category','id','action'].includes(key)) || !releaseRemovals.some(entry=>entry.category===change.category && entry.id===change.id))))throw new Error('The saved cleanup request does not match this release or admin address. No removal was sent.');
  let cookie,csrf;
  async function request(route,body) {
    const response=await fetcher(new URL('/api/'+route,origin),{method:body===undefined?'GET':'POST',redirect:'error',cache:'no-store',headers:{...(cookie?{cookie}:{}),...(body===undefined?{}:{origin,'content-type':'application/json',...(csrf?{'x-csrf-token':csrf}:{})})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
    let data;try{data=await response.json();}catch{throw new Error('The admin returned an unreadable cleanup response. Rerun the update to recover the same operation.');}
    if(!response.ok){const error=new Error(data.error||'Admin cleanup failed (HTTP '+response.status+').');error.status=response.status;throw error;}
    if(route==='login'){cookie=response.headers.get('set-cookie')?.split(';')[0];csrf=data.csrf;if(!cookie || !csrf)throw new Error('Cleanup login did not confirm a secure session.');}
    return data;
  }
  async function store(value){
    await mkdir(configDirectory,{recursive:true});const temporary=checkpoint+'.'+randomUUID()+'.next';
    try{await writeFile(temporary,JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(temporary,checkpoint);saved=value;}
    finally{await unlink(temporary).catch(()=>{});}
  }
  async function plan(snapshot) {
    const changes=pendingReleaseRemovals(snapshot);
    if(!changes.length){await store({version:127,origin,status:'done',removed:[],sha:snapshot.head});return null;}
    const input={id:randomUUID(),head:snapshot.head,changes};await store({version:127,origin,status:'pending',input});return input;
  }
  await request('login',{username,password});
  try {
    let input=saved?.input||await plan(await request('catalog'));
    if(!input)return {confirmed:true,alreadyApplied:true,removed:[],sha:saved.sha};
    let result;
    for(let attempt=0;attempt<4;attempt++) {
      try{result=await request('publish',input);break;}catch(error) {
        if(error.status===409 && /repository changed|entry was already removed/i.test(error.message)) {
          input=await plan(await request('catalog'));if(!input)return {confirmed:true,alreadyApplied:true,removed:[],sha:saved.sha};
        } else if(error.status && error.status!==409 && error.status<500)throw error;
        if(attempt===3)throw new Error(error.message+' The pending request was retained; rerun Upgrade-Admin.ps1 to recover it.');
        await wait(2000);
      }
    }
    if(!/^[a-f0-9]{40}$/.test(result?.sha||''))throw new Error('GitHub did not confirm the cleanup commit. The pending request was retained.');
    let current;
    for(let attempt=0;attempt<3;attempt++){current=await request('catalog');if(!pendingReleaseRemovals(current).length)break;await wait(1500);}
    if(pendingReleaseRemovals(current).length)throw new Error('The cleanup commit was saved, but the latest catalog was not confirmed. Rerun the update to verify the same operation.');
    const removed=input.changes.map(change=>releaseRemovals.find(entry=>entry.category===change.category && entry.id===change.id).name);
    await store({version:127,origin,status:'done',removed,sha:result.sha});
    return {confirmed:true,alreadyApplied:false,removed,sha:result.sha};
  } finally {await request('logout',{});}
}

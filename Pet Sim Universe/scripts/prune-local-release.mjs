import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {decodeSnapshot,editSnapshot} from '../admin/data.js';
import {pendingReleaseRemovals} from './release-removals.mjs';
import {root} from './discord-tools.mjs';

export async function pruneLocalRelease(project) {
  const snapshot=decodeSnapshot(await readFile(path.join(project,'public/data/catalog.js'),'utf8'),await readFile(path.join(project,'public/data/prices.js'),'utf8'));
  const changes=pendingReleaseRemovals(snapshot);if(!changes.length)return {removed:0};
  const edited=await editSnapshot(snapshot,{changes}),backup=path.join(project,'.cloudflare/v127-local-data-backup'),saved=new Map(),written=[],temporary=[];
  await mkdir(backup,{recursive:true});
  try {
    for(const file of edited.files) {
      let original=null;try{original=await readFile(path.join(project,file.path));}catch(error){if(error.code!=='ENOENT')throw error;}saved.set(file.path,original);
      if(original)try{await writeFile(path.join(backup,path.basename(file.path)),original,{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}
      const staging=path.join(backup,randomUUID()+'.next');await writeFile(staging,file.content);temporary.push({staging,destination:path.join(project,file.path),name:file.path});
    }
    for(const file of temporary){await rename(file.staging,file.destination);written.push(file.name);}
  } catch(error) {
    for(const name of written){const original=saved.get(name);if(original)await writeFile(path.join(project,name),original);else await unlink(path.join(project,name));}
    throw error;
  } finally {for(const file of temporary)await unlink(file.staging).catch(()=>{});}
  return {removed:changes.length};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try{const result=await pruneLocalRelease(root);console.log(`Local catalog cleanup confirmed: ${result.removed} requested cards removed; other local prices retained.`);}catch(error){console.error(error.message);process.exitCode=1;}
}

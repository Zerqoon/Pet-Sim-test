import {readFile,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {createWrangler,root} from './discord-tools.mjs';
import {verifyFreeAdmin} from './admin-deploy-check.mjs';
import {applyReleaseRemovals} from './apply-release-removals.mjs';
import {discordUrl} from '../server/pricing.js';
import {recoverConfiguration} from './recover-admin.mjs';
import {adminConfig} from './free-admin-config.mjs';
let audit='';
try {
  const configPath=path.join(root,'.cloudflare/admin.json');
  let config;try{config=JSON.parse(await readFile(configPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw new Error('Existing admin configuration is invalid. Keep a backup before repair.');await recoverConfiguration({project:root,wrangler:createWrangler(),makeAdmin:adminConfig});config=JSON.parse(await readFile(configPath,'utf8'));}
  const domain=process.env.PET_UNIVERSE_ADMIN_DOMAIN||'';
  if(domain && !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain))throw new Error('Use a hostname without https:// or a path.');
  const hooks=JSON.parse(await readFile(path.join(root,'private-setup/admin-webhooks.private.json'),'utf8'));
  audit=discordUrl(hooks.ADMIN_WEBHOOK_URL).href;
  config.main='../admin/worker.js';config.assets={directory:'../admin/public',binding:'ASSETS',run_worker_first:true};
  delete config.limits;config.workers_dev=true;config.keep_vars=true;
  config.vars={...config.vars,SITE_URL:'https://petuniverse-values.pl'};
  if(domain)config.routes=[{pattern:domain,custom_domain:true}];else delete config.routes;
  process.env.CLOUDFLARE_ACCOUNT_ID=config.account_id;
  const wrangler=createWrangler([audit]);
  const backupPath=path.join(root,'.cloudflare/admin-before-v128.json');
  try{await writeFile(backupPath,await readFile(configPath,'utf8'),{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
  await writeFile(configPath,JSON.stringify(config,null,2)+'\n');
  const temporary=path.join(root,'.cloudflare/admin-audit.private.json');
  await writeFile(temporary,JSON.stringify({ADMIN_WEBHOOK_URL:audit}),{mode:0o600});
  try{await wrangler(['secret','bulk',temporary,'--config',configPath]);}finally{await unlink(temporary).catch(()=>{});}
  console.log('Deploying the card editor. Existing GitHub token, accounts and price monitor are retained.');
  await writeFile(path.join(root,'admin/public/price-core.js'),await readFile(path.join(root,'public/data/price-core.js')));
  const output=await wrangler(['deploy','--config',configPath]);
  const url=domain?'https://'+domain:output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\b/i)?.[0];
  if(!url)throw new Error('Cloudflare did not return the admin address.');
  const password=(await readFile(path.join(root,'private-setup/LOGIN.private.txt'),'utf8')).split(/\r?\n/).find(x=>x.startsWith('Zerqoon: '))?.slice(9);
  await verifyFreeAdmin(url,{username:'Zerqoon',password});
  const cleanup=await applyReleaseRemovals(url,{username:'Zerqoon',password},{configDirectory:path.join(root,'.cloudflare')});
  console.log(cleanup.removed.length?'Requested card cleanup confirmed: '+cleanup.removed.join(', '):'Requested cleanup is already applied.');
  await writeFile(path.join(root,'.cloudflare/admin-info.json'),JSON.stringify({url,repository:'Zerqoon/Pet-Sim-test'},null,2)+'\n');
  await writeFile(path.join(root,'private-setup/ADMIN-ADDRESS.private.txt'),url+'\n');
  console.log('\nADMIN READY: '+url+'\nLogin, GitHub catalog and image loading verified.');
}catch(error){console.error(String(error.message||'Admin update failed.').split(audit||'\0').join('[hidden]'));process.exitCode=1;}

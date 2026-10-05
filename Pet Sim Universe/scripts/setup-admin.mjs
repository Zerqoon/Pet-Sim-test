import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {prepareFreeAccounts,adminConfig} from './free-admin-config.mjs';
import {createWrangler,parseJsonList,root} from './discord-tools.mjs';
import {github} from '../admin/github.js';
import {SCHEMA} from '../admin/worker.js';
import {discordUrl} from '../server/pricing.js';
import {verifyFreeAdmin} from './admin-deploy-check.mjs';

const token=process.env.PET_UNIVERSE_GITHUB_TOKEN;
let webhook='';
try {
  if(Number(process.versions.node.split('.')[0])<22)throw new Error('Install Node.js 22.13 or newer.');
  if(!token)throw new Error('Run Setup-Admin.ps1 and provide the GitHub token when prompted.');
  const privateDirectory=path.join(root,'private-setup');
  const secretData=await prepareFreeAccounts(privateDirectory);
  webhook=secretData.DISCORD_WEBHOOK_URL;discordUrl(webhook);
  await github({GITHUB_TOKEN:token}).snapshot();
  console.log('Repository and catalog confirmed. Installing admin for Workers Free; no paid CPU settings.');
  let monitor=null;
  try {monitor=JSON.parse(await readFile(path.join(root,'.cloudflare/price-monitor.json'),'utf8'));} catch {}
  if(!monitor?.account_id || !monitor.d1_databases?.some(x=>x.binding==='MONITOR_DB')) {
    await new Promise((resolve,reject)=> {
      const child=spawn(process.execPath,[path.join(root,'scripts/setup-discord.mjs')],{cwd:root,stdio:'inherit',env:{...process.env,PET_UNIVERSE_WEBHOOK:webhook}});
      child.once('error',()=>reject(new Error('Could not start the Discord setup.')));
      child.once('exit',code=>code===0?resolve():reject(new Error('Discord setup failed. Fix the reported issue, then rerun Setup-Admin.ps1.')));
    });
    monitor=JSON.parse(await readFile(path.join(root,'.cloudflare/price-monitor.json'),'utf8'));
  } else console.log('Existing Discord monitor configuration retained. Installing only the separate admin.');
  process.env.CLOUDFLARE_ACCOUNT_ID=monitor.account_id;
  const wrangler=createWrangler([token,webhook]);
  const databaseName='pet-universe-admin';
  let databases=parseJsonList(await wrangler(['d1','list','--json'],{capture:true}));
  let database=databases.find(x=>x.name===databaseName);
  if(!database){await wrangler(['d1','create',databaseName,'--update-config=false']);databases=parseJsonList(await wrangler(['d1','list','--json'],{capture:true}));database=databases.find(x=>x.name===databaseName);}
  if(!database?.uuid)throw new Error('Admin database was not found.');
  const dir=path.join(root,'.cloudflare');await mkdir(dir,{recursive:true});
  const configPath=path.join(dir,'admin.json');
  const config=adminConfig({accountId:monitor.account_id,databaseId:database.uuid,site:process.env.PET_UNIVERSE_SITE||'https://petuniverse-values.pl'});
  await writeFile(configPath,JSON.stringify(config,null,2)+'\n');
  const schemaPath=path.join(dir,'admin-schema.sql');await writeFile(schemaPath,SCHEMA.join(';\n')+';\n');
  await wrangler(['d1','execute',databaseName,'--remote','--file',schemaPath,'--config',configPath]);
  const output=await wrangler(['deploy','--config',configPath]);
  const url=output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\b/i)?.[0];if(!url)throw new Error('Admin address was not returned by Cloudflare.');
  const deploySecrets=path.join(dir,'admin-deployment.private.json');
  await writeFile(deploySecrets,JSON.stringify({GITHUB_TOKEN:token,ADMIN_USERS:secretData.ADMIN_USERS,AUTH_PEPPER:secretData.AUTH_PEPPER,DISCORD_WEBHOOK_URL:webhook}),{mode:0o600});
  try {await wrangler(['secret','bulk',deploySecrets,'--config',configPath]);}
  finally {const {unlink}=await import('node:fs/promises');await unlink(deploySecrets).catch(()=>{});}
  const installed=parseJsonList(await wrangler(['secret','list','--config',configPath,'--format','json'],{capture:true}));
  for(const name of ['GITHUB_TOKEN','ADMIN_USERS','AUTH_PEPPER','DISCORD_WEBHOOK_URL']) if(!installed.some(x=>x.name===name&&x.type==='secret_text'))throw new Error('Admin secret installation was not confirmed: '+name);
  const loginLines=(await readFile(path.join(privateDirectory,'LOGIN.private.txt'),'utf8')).split(/\r?\n/);
  const password=loginLines.find(x=>x.startsWith('Zerqoon: '))?.slice(9);
  const verified=await verifyFreeAdmin(url,{username:'Zerqoon',password});
  console.log(`Free admin confirmed: login works, GitHub catalog loaded (${verified.petCount} pets), temporary session closed.`);
  await writeFile(path.join(dir,'admin-info.json'),JSON.stringify({url,repository:'Zerqoon/Pet-Sim-test'},null,2)+'\n');
  await writeFile(path.join(privateDirectory,'ADMIN-ADDRESS.private.txt'),url+'\n');
  console.log('\nADMIN DEPLOYED: '+url);
  console.log('Passwords: private-setup/LOGIN.private.txt');
  console.log('Sign in, then use Test Discord. No main website layout was changed.');
  console.log('The setup may write a monitor URL locally. Future Upload-GitHub runs preserve catalog edits by default.');
} catch(error) {
  const message=[token,webhook].filter(Boolean).reduce((s,secret)=>s.split(secret).join('[hidden]'),String(error.message||'Setup failed.'));
  console.error(message);process.exitCode=1;
}

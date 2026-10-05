import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {createInterface} from 'node:readline/promises';
import {createWrangler,parseJsonList,root} from './discord-tools.mjs';
import {github} from '../admin/github.js';
import {SCHEMA} from '../admin/worker.js';
import {discordUrl} from '../server/pricing.js';

const token=process.env.PET_UNIVERSE_GITHUB_TOKEN;
let webhook='';
try {
  if(Number(process.versions.node.split('.')[0])<22)throw new Error('Install Node.js 22.13 or newer.');
  if(!token)throw new Error('Run Setup-Admin.ps1 and provide the GitHub token when prompted.');
  const privateDirectory=path.join(root,'private-setup');
  const secretData=JSON.parse(await readFile(path.join(privateDirectory,'admin-secrets.private.json'),'utf8'));
  webhook=secretData.DISCORD_WEBHOOK_URL;discordUrl(webhook);
  await github({GITHUB_TOKEN:token}).snapshot();
  console.log('Repository and catalog confirmed. Admin requires Workers Paid for the configured CPU budget; this script does not enable billing.');
  // Configure both workers with the same new webhook. This confirms an actual
  // Discord response and deployed main-site prices, rather than claiming success.
  await new Promise((resolve,reject)=> {
    const child=spawn(process.execPath,[path.join(root,'scripts/setup-discord.mjs')],{cwd:root,stdio:'inherit',env:{...process.env,PET_UNIVERSE_WEBHOOK:webhook}});
    child.once('error',()=>reject(new Error('Could not start the Discord setup.')));
    child.once('exit',code=>code===0?resolve():reject(new Error('Discord setup failed. Fix the reported issue, then rerun Setup-Admin.ps1.')));
  });
  const monitor=JSON.parse(await readFile(path.join(root,'.cloudflare/price-monitor.json'),'utf8'));
  process.env.CLOUDFLARE_ACCOUNT_ID=monitor.account_id;
  const wrangler=createWrangler([token,webhook]);
  const databaseName='pet-universe-admin';
  let databases=parseJsonList(await wrangler(['d1','list','--json'],{capture:true}));
  let database=databases.find(x=>x.name===databaseName);
  if(!database){await wrangler(['d1','create',databaseName,'--update-config=false']);databases=parseJsonList(await wrangler(['d1','list','--json'],{capture:true}));database=databases.find(x=>x.name===databaseName);}
  if(!database?.uuid)throw new Error('Admin database was not found.');
  const dir=path.join(root,'.cloudflare');await mkdir(dir,{recursive:true});
  const configPath=path.join(dir,'admin.json');
  const config={name:'pet-universe-admin',account_id:monitor.account_id,main:'../admin/worker.js',compatibility_date:'2026-10-01',workers_dev:true,
    limits:{cpu_ms:1000},
    assets:{directory:'../admin/public',binding:'ASSETS',run_worker_first:true},
    d1_databases:[{binding:'ADMIN_DB',database_name:databaseName,database_id:database.uuid}],
    vars:{GITHUB_REPO:'Zerqoon/Pet-Sim-test',GITHUB_BRANCH:'main',PROJECT_PATH:'Pet Sim Universe',SITE_URL:process.env.PET_UNIVERSE_SITE||'https://petuniverse-values.pl'},triggers:{crons:['* * * * *']},observability:{enabled:true}};
  await writeFile(configPath,JSON.stringify(config,null,2)+'\n');
  const schemaPath=path.join(dir,'admin-schema.sql');await writeFile(schemaPath,SCHEMA.join(';\n')+';\n');
  await wrangler(['d1','execute',databaseName,'--remote','--file',schemaPath,'--config',configPath]);
  const output=await wrangler(['deploy','--config',configPath]);
  const url=output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\b/i)?.[0];if(!url)throw new Error('Admin address was not returned by Cloudflare.');
  const deploySecrets=path.join(dir,'admin-deployment.private.json');
  await writeFile(deploySecrets,JSON.stringify({GITHUB_TOKEN:token,ADMIN_USERS:secretData.ADMIN_USERS,DISCORD_WEBHOOK_URL:webhook}),{mode:0o600});
  try {await wrangler(['secret','bulk',deploySecrets,'--config',configPath]);}
  finally {const {unlink}=await import('node:fs/promises');await unlink(deploySecrets).catch(()=>{});}
  const installed=parseJsonList(await wrangler(['secret','list','--config',configPath,'--format','json'],{capture:true}));
  for(const name of ['GITHUB_TOKEN','ADMIN_USERS','DISCORD_WEBHOOK_URL']) if(!installed.some(x=>x.name===name&&x.type==='secret_text'))throw new Error('Admin secret installation was not confirmed: '+name);
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

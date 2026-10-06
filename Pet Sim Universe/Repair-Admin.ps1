param(
    [string]$ProjectPath = "C:\Users\zerqo\Desktop\Pet Sim Universe",
    [string]$AdminDomain = "admin.petuniverse-values.pl"
)
$ErrorActionPreference = "Stop"
$projectDirectory = [IO.Path]::GetFullPath($ProjectPath)
foreach ($requiredFile in @("Update-Project.ps1", "scripts\discord-tools.mjs", "scripts\free-admin-config.mjs", "private-setup\LOGIN.private.txt", "private-setup\admin-webhooks.private.json")) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory $requiredFile) -PathType Leaf)) {
        throw "Nie znaleziono $requiredFile w $projectDirectory. Wskaz rozpakowany projekt v127 parametrem -ProjectPath."
    }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Zainstaluj Node.js 22.13 lub nowszy z npm." }
$recoveryFile = Join-Path $projectDirectory ("scripts\recover-admin-" + [Guid]::NewGuid().ToString("N") + ".mjs")
$recoverySource = @'
import {readFile,writeFile,mkdir,unlink,link} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {pathToFileURL} from 'node:url';

const accountPattern=/^[a-f0-9]{32}$/i;
const databasePattern=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const requiredAdmin=['GITHUB_TOKEN','ADMIN_USERS','AUTH_PEPPER'];

function decode(text,kind) {
  const cleaned=String(text).replace(/^\uFEFF/,'').trim();
  try{return JSON.parse(cleaned);}catch{}
  const start=cleaned.indexOf(kind==='list'?'[':'{');
  if(start>=0)try{return JSON.parse(cleaned.slice(start));}catch{}
  throw new Error('Nie odczytano odpowiedzi Cloudflare. Przerwano odzyskiwanie konfiguracji.');
}

async function localConfig(file,binding,name) {
  let text;try{text=await readFile(file,'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}
  let config;try{config=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw new Error('Uszkodzony plik '+path.basename(file)+'. Zachowaj jego kopie przed naprawa.');}
  const database=config.d1_databases?.find(item=>item.binding===binding);
  if(config.name!==name||!accountPattern.test(config.account_id||'')||!databasePattern.test(database?.database_id||'')) {
    throw new Error('Nieprawidlowa lokalna konfiguracja '+path.basename(file)+'. Nie zastapiono tego pliku.');
  }
  return config;
}

export async function recoverConfiguration({project,wrangler,makeAdmin,env=process.env,choose,log=console.log}) {
  const directory=path.join(project,'.cloudflare');
  const adminFile=path.join(directory,'admin.json');
  const monitorFile=path.join(directory,'price-monitor.json');
  const existingAdmin=await localConfig(adminFile,'ADMIN_DB','pet-universe-admin');
  const existingMonitor=await localConfig(monitorFile,'MONITOR_DB','pet-universe-price-monitor');
  if(existingAdmin&&existingMonitor){log('Konfiguracje juz istnieja. Mozna wznowic aktualizacje.');return {created:[]};}
  const hints=[env.CLOUDFLARE_ACCOUNT_ID,existingAdmin?.account_id,existingMonitor?.account_id].filter(Boolean);
  if(hints.some(value=>!accountPattern.test(value))||new Set(hints.map(value=>value.toLowerCase())).size>1) {
    throw new Error('Konfiguracje wskazuja rozne konta Cloudflare. Nie zmieniono plikow.');
  }
  let accounts;
  if(hints.length)accounts=[{id:hints[0],name:'Konto obecnego projektu'}];
  else {
    let identity;
    try{identity=decode(await wrangler(['whoami','--json'],{capture:true}),'object');}
    catch(error){
      if(env.CLOUDFLARE_API_TOKEN)throw error;
      log('Zaloguj sie w przegladarce na konto Cloudflare, na ktorym dziala Twoj admin.');
      await wrangler(['login']);
      identity=decode(await wrangler(['whoami','--json'],{capture:true}),'object');
    }
    const raw=identity.accounts||identity.result?.accounts||identity.user?.accounts;
    accounts=(Array.isArray(raw)?raw:[]).map(item=>({id:item.id||item.account_id,name:item.name||'Konto Cloudflare'})).filter(item=>accountPattern.test(item.id||''));
    if(!accounts.length) {
      const ids=[...new Set(JSON.stringify(identity).match(/\b[a-f0-9]{32}\b/gi)||[])];
      accounts=ids.map(id=>({id,name:'Konto Cloudflare'}));
    }
    accounts=accounts.filter((item,index)=>accounts.findIndex(other=>other.id.toLowerCase()===item.id.toLowerCase())===index);
    if(!accounts.length)throw new Error('Nie znaleziono konta Cloudflare. Ustaw CLOUDFLARE_ACCOUNT_ID na Account ID Twojego konta.');
  }
  await mkdir(directory,{recursive:true});
  const temporary=path.join(directory,'recovery-'+randomUUID()+'.json');
  const previousAccount=env.CLOUDFLARE_ACCOUNT_ID;
  const matches=[];
  try {
    for(const account of accounts) {
      env.CLOUDFLARE_ACCOUNT_ID=account.id;
      await writeFile(temporary,JSON.stringify({name:'pet-universe-admin',account_id:account.id,compatibility_date:'2026-10-01'})+'\n',{mode:0o600});
      try {
        const databases=decode(await wrangler(['d1','list','--json','--config',temporary],{capture:true}),'list');
        if(!Array.isArray(databases))throw new Error('Nie odczytano listy baz D1.');
        const admin=databases.filter(item=>item.name==='pet-universe-admin');
        if(admin.length!==1||!databasePattern.test(admin[0]?.uuid||''))continue;
        if(existingAdmin&&existingAdmin.d1_databases.find(item=>item.binding==='ADMIN_DB').database_id!==admin[0].uuid)continue;
        const secrets=decode(await wrangler(['secret','list','--name','pet-universe-admin','--format','json','--config',temporary],{capture:true}),'list');
        if(!Array.isArray(secrets)||requiredAdmin.some(name=>!secrets.some(item=>item.name===name&&item.type==='secret_text')))continue;
        let monitor=null;
        if(!existingMonitor) {
          const found=databases.filter(item=>item.name==='pet-universe-price-monitor');
          if(found.length===1&&databasePattern.test(found[0]?.uuid||'')) {
            try {
              const monitorSecrets=decode(await wrangler(['secret','list','--name','pet-universe-price-monitor','--format','json','--config',temporary],{capture:true}),'list');
              if(Array.isArray(monitorSecrets)&&['DISCORD_WEBHOOK_URL','MONITOR_KEY'].every(name=>monitorSecrets.some(item=>item.name===name&&item.type==='secret_text')))monitor=found[0];
            }catch{log('Nie potwierdzono konfiguracji monitora. Istniejacy monitor pozostaje bez zmian.');}
          }
        }
        matches.push({account,admin:admin[0],monitor});
      }catch{log('Nie potwierdzono panelu na jednym z dostepnych kont. Sprawdzanie pozostalych...');}
    }
  }finally {
    await unlink(temporary).catch(()=>{});
    if(previousAccount===undefined)delete env.CLOUDFLARE_ACCOUNT_ID;else env.CLOUDFLARE_ACCOUNT_ID=previousAccount;
  }
  if(!matches.length)throw new Error('Nie znaleziono istniejacego admina z baza i zapisanymi sekretami. Zaloguj Wrangler na konto, na ktorym dziala admin.petuniverse-values.pl. Nie utworzono nowego panelu.');
  const selected=matches.length===1?matches[0]:await choose?.(matches);
  if(!selected||!matches.includes(selected))throw new Error('Nie wybrano jednoznacznie konta Cloudflare. Nie zmieniono konfiguracji.');
  const configs=[];
  if(!existingAdmin) {
    const config=makeAdmin({accountId:selected.account.id,databaseId:selected.admin.uuid,domain:'admin.petuniverse-values.pl'});
    config.keep_vars=true;
    configs.push([adminFile,config]);
  }
  if(!existingMonitor&&selected.monitor)configs.push([monitorFile,{
    name:'pet-universe-price-monitor',account_id:selected.account.id,main:'../workers/price-monitor.js',compatibility_date:'2026-10-01',workers_dev:true,keep_vars:true,
    triggers:{crons:['* * * * *']},vars:{SITE_URL:'https://petuniverse-values.pl'},
    d1_databases:[{binding:'MONITOR_DB',database_name:'pet-universe-price-monitor',database_id:selected.monitor.uuid}],observability:{enabled:true}
  }]);
  const created=[];
  const stages=[];
  try {
    for(const [file,config] of configs) {
      const stage=file+'.'+randomUUID()+'.next';stages.push(stage);
      await writeFile(stage,JSON.stringify(config,null,2)+'\n',{mode:0o600,flag:'wx'});
      // Linking creates the final file atomically and refuses to overwrite any
      // configuration created by another process while recovery was running.
      await link(stage,file);created.push(file);
    }
  }catch(error){for(const file of created)await unlink(file).catch(()=>{});throw error;}
  finally{for(const stage of stages)await unlink(stage).catch(()=>{});}
  log('Odzyskano lokalna konfiguracje istniejacego panelu. Token i konta sa nadal zapisane w Cloudflare.');
  return {created};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if(Number(process.versions.node.split('.')[0])<22)throw new Error('Wymagany jest Node.js 22.13 lub nowszy.');
    const {createWrangler,root}=await import('./discord-tools.mjs');
    const {adminConfig}=await import('./free-admin-config.mjs');
    await recoverConfiguration({project:root,wrangler:createWrangler(),makeAdmin:adminConfig,choose:async matches=>{
      matches.forEach((item,index)=>console.log((index+1)+'. '+item.account.name));
      const input=createInterface({input:process.stdin,output:process.stdout});
      try {const answer=Number(await input.question('Numer konta z Twoim projektem: '));return Number.isInteger(answer)?matches[answer-1]:null;}finally{input.close();}
    }});
  }catch(error){console.error(error.message||'Nie udalo sie odzyskac konfiguracji.');process.exitCode=1;}
}

'@
Push-Location $projectDirectory
try {
    [IO.File]::WriteAllText($recoveryFile, $recoverySource, [Text.UTF8Encoding]::new($false))
    Write-Host "Odzyskuje konfiguracje istniejacego panelu z Cloudflare..." -ForegroundColor Cyan
    & node $recoveryFile
    if ($LASTEXITCODE -ne 0) { throw "Nie potwierdzono konfiguracji. Nie uruchomiono aktualizacji. Sprawdz komunikat powyzej." }
    Write-Host "Konfiguracja gotowa. Wznawiam aktualizacje projektu i admina." -ForegroundColor Green
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $projectDirectory "Update-Project.ps1") -ProjectPath $projectDirectory -AdminDomain $AdminDomain
    if ($LASTEXITCODE -ne 0) { throw "Konfiguracja odzyskana, ale aktualizacja nie zostala zakonczona. Sprawdz komunikat powyzej." }
} finally {
    Remove-Item -LiteralPath $recoveryFile -Force -ErrorAction SilentlyContinue
    Pop-Location
}

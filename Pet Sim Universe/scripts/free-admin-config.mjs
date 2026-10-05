import {randomBytes} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {passwordHash} from '../admin/auth.js';

export async function prepareFreeAccounts(directory) {
  const file=path.join(directory,'admin-secrets.private.json');
  const secrets=JSON.parse(await readFile(file,'utf8'));
  const logins=(await readFile(path.join(directory,'LOGIN.private.txt'),'utf8')).split(/\r?\n/);
  if(!secrets.AUTH_PEPPER) secrets.AUTH_PEPPER=randomBytes(32).toString('hex');
  if(!/^[a-f0-9]{64}$/.test(secrets.AUTH_PEPPER)) throw new Error('Invalid private server key.');
  const old=JSON.parse(secrets.ADMIN_USERS || '[]'),users=[];
  for(const username of ['Zerqoon','Pioterek']) {
    const line=logins.find(x=>x.startsWith(username+': '));
    const password=line?.slice(username.length+2);
    if(!/^[A-Za-z0-9_-]{24}$/.test(password || '')) throw new Error('Keep the generated 24-character passwords. Run reset-admin-passwords.mjs if the private login file is missing or edited.');
    const salt=old.find(x=>x.username===username)?.salt || randomBytes(24).toString('hex');
    users.push({username,salt,scheme:'random-hmac-v1',hash:await passwordHash(password,salt,secrets.AUTH_PEPPER)});
  }
  secrets.ADMIN_USERS=JSON.stringify(users);
  const output=JSON.stringify(secrets,null,2)+'\n';
  if(output!==await readFile(file,'utf8')) await writeFile(file,output,{mode:0o600});
  return secrets;
}

export function adminConfig({accountId,databaseId,site='https://petuniverse-values.pl'}) {
  return {name:'pet-universe-admin',account_id:accountId,main:'../admin/worker.js',compatibility_date:'2026-10-01',workers_dev:true,
    // No paid-only CPU or subrequest overrides. Use the account's Free limits.
    assets:{directory:'../admin/public',binding:'ASSETS',run_worker_first:true},
    d1_databases:[{binding:'ADMIN_DB',database_name:'pet-universe-admin',database_id:databaseId}],
    vars:{GITHUB_REPO:'Zerqoon/Pet-Sim-test',GITHUB_BRANCH:'main',PROJECT_PATH:'Pet Sim Universe',SITE_URL:site},
    triggers:{crons:['* * * * *']},observability:{enabled:true}};
}

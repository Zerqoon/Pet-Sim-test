import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {passwordHash} from '../admin/worker.js';
import {root} from './discord-tools.mjs';
import path from 'node:path';
const directory=path.join(root,'private-setup'),file=path.join(directory,'admin-secrets.private.json');
const secrets=JSON.parse(await readFile(file,'utf8'));
const users=[],lines=['PET UNIVERSE — PRIVATE ADMIN LOGINS','Keep this file private. Do not upload it to GitHub or the public website.',''];
for(const username of ['Zerqoon','Pioterek']) {
  const password=randomBytes(18).toString('base64url'),salt=randomBytes(24).toString('hex');
  users.push({username,salt,hash:await passwordHash(password,salt)});
  lines.push(username+': '+password);
}
secrets.ADMIN_USERS=JSON.stringify(users);
await writeFile(file,JSON.stringify(secrets,null,2)+'\n',{mode:0o600});
await writeFile(path.join(directory,'LOGIN.private.txt'),lines.join('\n')+'\n',{mode:0o600});
console.log('New random passwords saved to private-setup/LOGIN.private.txt. Run Setup-Admin.ps1 to install them.');

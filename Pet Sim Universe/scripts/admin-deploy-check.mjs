import {pause} from './discord-tools.mjs';
export async function verifyFreeAdmin(url,{username,password},{fetcher=fetch,clock=Date.now,wait=pause,timeout=120000,delay=3000}={}) {
  const origin=new URL(url).origin,start=clock();
  let ready=false;
  do {
    try {
      const response=await fetcher(new URL('/api/ready',origin),{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
      const info=await response.json();ready=response.ok&&info.ready&&info.version===123&&info.hosting==='free';
    } catch {}
    if(ready) break;
    if(clock()-start>=timeout) throw new Error('New Free admin version was not confirmed. Rerun Setup-Admin.ps1.');
    console.log('Waiting for Free admin code and secrets to activate...');await wait(delay);
  } while(clock()-start<timeout);
  if(!ready) throw new Error('Free admin activation was not confirmed.');
  const login=await fetcher(new URL('/api/login',origin),{method:'POST',redirect:'error',headers:{origin,'content-type':'application/json'},body:JSON.stringify({username,password}),signal:AbortSignal.timeout(15000)});
  if(!login.ok)throw new Error(`Admin login verification failed (HTTP ${login.status}). Check private-setup/LOGIN.private.txt.`);
  const session=await login.json(),cookie=login.headers.get('set-cookie')?.split(';')[0];
  if(!cookie || !session.csrf)throw new Error('Admin did not confirm a secure login session.');
  try {
    const response=await fetcher(new URL('/api/catalog',origin),{headers:{cookie},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error(`Authenticated catalog check failed (HTTP ${response.status}). Check the repository token.`);
    const data=await response.json();if(!data.head || !data.catalog?.PETS || !data.prices?.pets)throw new Error('Admin catalog response is incomplete.');
    return {confirmed:true,username:session.username,petCount:data.catalog.PETS.length};
  } finally {
    const logout=await fetcher(new URL('/api/logout',origin),{method:'POST',headers:{cookie,origin,'content-type':'application/json','x-csrf-token':session.csrf},body:'{}',redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!logout.ok)throw new Error('The temporary setup session could not be closed.');
  }
}

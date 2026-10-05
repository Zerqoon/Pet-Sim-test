import {Problem,decodeSnapshot} from './data.js';
const encodePath=path=>path.split('/').map(encodeURIComponent).join('/');
export function github(env,fetcher=fetch) {
  const repo=env.GITHUB_REPO || 'Zerqoon/Pet-Sim-test', branch=env.GITHUB_BRANCH || 'main', root=env.PROJECT_PATH || 'Pet Sim Universe';
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo) || !env.GITHUB_TOKEN) throw new Problem(503,'GitHub is not configured.');
  async function request(path,method='GET',body) {
    let response;
    try {response=await fetcher(`https://api.github.com/repos/${repo}/${path}`,{method,headers:{accept:'application/vnd.github+json',authorization:`Bearer ${env.GITHUB_TOKEN}`,'user-agent':'Pet-Universe-Admin','x-github-api-version':'2026-03-10',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(20000)});} catch {throw new Problem(502,'GitHub did not respond. Reload before retrying.');}
    if(!response.ok) throw new Problem([409,422].includes(response.status)?409:502,[409,422].includes(response.status)?'Another change was published. Reload and review your edits.':`GitHub returned HTTP ${response.status}. Check repository access.`);
    return response.json();
  }
  const head=async()=> (await request('git/ref/heads/'+encodePath(branch))).object.sha;
  async function read(path,sha) {
    const blob=await request(`contents/${encodePath(root+'/'+path)}?ref=${sha}`);
    if(blob.type!=='file' || blob.size>200000 || blob.encoding!=='base64') throw new Problem(502,'Unsupported repository data file.');
    return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(blob.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
  }
  async function snapshot() {
    const sha=await head(); const [catalogSource,priceSource]=await Promise.all([read('public/data/catalog.js',sha),read('public/data/prices.js',sha)]);
    return {head:sha,...decodeSnapshot(catalogSource,priceSource)};
  }
  async function publish(expectedHead,files,user,id) {
    if(await head()!==expectedHead) throw new Problem(409,'The repository changed. Reload and review your edits.');
    const parent=await request('git/commits/'+expectedHead); const tree=[];
    // Blobs and trees are unreachable until a single fast-forward publishes the commit.
    for(const file of files) {
      if(!/^public\/(?:data\/(?:catalog|prices|price-updates)\.js|assets\/(?:pets|eggs|items|charms)\/[a-z0-9-]+\.png)$/.test(file.path)) throw new Problem(400,'Write path is not allowed.');
      const blob=file.sha ? {sha:file.sha} : await request('git/blobs','POST',{content:file.content,encoding:file.encoding});
      tree.push({path:root+'/'+file.path,mode:'100644',type:'blob',sha:blob.sha});
    }
    const built=await request('git/trees','POST',{base_tree:parent.tree.sha,tree});
    const commit=await request('git/commits','POST',{message:`Update values and catalog (${user})\n\nAdmin operation: ${id}`,tree:built.sha,parents:[expectedHead]});
    try {await request('git/refs/heads/'+encodePath(branch),'PATCH',{sha:commit.sha,force:false});}
    catch(error) {
      // Recover a timed-out successful update without publishing twice.
      if(await head()!==commit.sha) throw error;
    }
    return {sha:commit.sha,url:`https://github.com/${repo}/commit/${commit.sha}`};
  }
  async function assertAsset(path,sha) {
    if(!/^assets\/(?:pets|charms|eggs|items|sources)\/[A-Za-z0-9_-]+\.png$/.test(path)) throw new Problem(400,'Invalid image path.');
    const asset=await request(`contents/${encodePath(root+'/public/'+path)}?ref=${sha}`);
    if(asset.type!=='file') throw new Problem(400,'The image does not exist in the repository. Upload a PNG first.');
  }
  async function upload(content) {return request('git/blobs','POST',{content,encoding:'base64'});}
  return {snapshot,publish,head,request,assertAsset,upload};
}

import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {onRequestGet as history} from '../functions/api/history.js';
import {onRequestGet as health} from '../functions/api/health.js';
import {onRequestPost as snapshot} from '../functions/api/snapshot.js';
const root=path.resolve(import.meta.dirname,'../public');
const port=Number(process.env.PORT || 4173);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  const handlers={'/api/history':history,'/api/health':health,'/api/snapshot':snapshot};
  if(handlers[url.pathname]){
   const response=await handlers[url.pathname]({request:new Request(url,{method:req.method}),env:{}});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
  }
  let file=path.resolve(root,decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  const bytes=await readFile(file);
  res.writeHead(200,{'content-type':mime[path.extname(file)] || 'application/octet-stream','cache-control':'no-cache'});res.end(bytes);
 }catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Pet Universe Values: http://127.0.0.1:${port}`));

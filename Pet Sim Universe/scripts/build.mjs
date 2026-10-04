import {readFile,writeFile,mkdir,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import { updatePriceTime } from './update-price-time.mjs';
const root = path.resolve(import.meta.dirname, '..');
const publicRoot = path.join(root,'public');
await updatePriceTime(root);
let html = await readFile(path.join(root,'src/index.html'),'utf8');
html = html.replace(/(<div class="home-v40-orbit"[\s\S]*?<img)\s/, '$1 data-orbit-image="true" ');
const hash = text => createHash('sha256').update(text).digest('hex').slice(0,14);
const cssSources = [...html.matchAll(/<link rel="stylesheet" href="\.\/(.*?)"\s*\/>/g)].map(match=>match[1]);
if (!cssSources.length) throw new Error('No stylesheet sources found.');
let css = (await Promise.all(cssSources.map(file=>readFile(path.join(publicRoot,file),'utf8')))).join('\n');
const assetModule = await readFile(path.join(publicRoot,'data/image-assets.js'),'utf8');
const assetMatch = assetModule.match(/export const IMAGE_ASSETS = ([\s\S]*);/);
const assets = JSON.parse(assetMatch[1]);
// If an original is replaced, use that exact new PNG immediately. This avoids
// stale optimized art and lets catalog editors add images without new tools.
for (const [source, asset] of Object.entries(assets)) {
  const original = await readFile(path.join(publicRoot,source));
  const digest = createHash('sha256').update(original).digest('hex').slice(0,12);
  if (!asset.src.endsWith(`-${digest}.webp`)) {
    const width = original.readUInt32BE(16);
    const height = original.readUInt32BE(20);
    assets[source] = {src:`${source}?v=${digest}`,width,height,srcset:`${source}?v=${digest} ${width}w`};
  }
}
css = css.replace(/url\(['"]?(\.\/)?(assets\/[^)'"\s]+)['"]?\)/g,(_,prefix,source)=>`url('../${assets[source]?.src || source}')`);
// Comments and blank lines are removed; selectors/declarations stay in the
// exact original cascade order, including all mobile and light-theme rules.
css = css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n');
const imageModule = `const IMAGE_ASSETS = ${JSON.stringify(assets)};`;
// Prices remain in prices.js, imported through the editable catalog. A price-only GitHub commit must
// work even when Pages publishes the existing bundle without running a build.
const app = (await readFile(path.join(publicRoot,'app.js'),'utf8'))
  .replace(/from (['"])\.\/data\/([^'"\n]+)\1/g, "from '../data/$2'")
  .replace(/^import .*? from (['"])\.\.?\/data\/image-assets\.js\1;\s*$/gm, '');
const javascript = `// Generated from data/image-assets.js and app.js; prices import ../data/catalog.js.\n${imageModule}\n${app}`;
const cssName=`styles-${hash(css)}.css`;
const jsName=`app-${hash(javascript)}.js`;
const bundleRoot=path.join(publicRoot,'bundle');
await mkdir(bundleRoot,{recursive:true});
for (const old of await readdir(bundleRoot)) if (/^(styles|app)-[a-f0-9]+\.(css|js)$/.test(old)) await rm(path.join(bundleRoot,old));
await writeFile(path.join(bundleRoot,cssName),css);
await writeFile(path.join(bundleRoot,jsName),javascript);
let first=true;
html=html.replace(/\s*<link rel="stylesheet" href="\.\/(.*?)"\s*\/>/g,()=>{
 if(!first)return '';first=false;
 return `\n  <link rel="stylesheet" href="./bundle/${cssName}" />\n  <link rel="modulepreload" href="./bundle/${jsName}" />`;
});
html=html.replace('src="./app.js"',`src="./bundle/${jsName}"`);
html=html.replace(/<img\b([^>]*?)\s*\/?>/g,(tag,attributes)=>{
 const match=attributes.match(/\bsrc="([^"]+)"/);if(!match || !assets[match[1]])return tag;
 const source=match[1];const asset=assets[source];
 attributes=attributes.replace(/\s+\/$/,'').replace(/\bsrc="[^"]+"/,`src="${asset.src}"`);
 const icon=source.startsWith('assets/ui/') || source.endsWith('/value-ticket.png');
 const large=attributes.includes('id="modalImage"') || source.includes('pop-cat');
 const sizes=attributes.includes('data-orbit-image') ? '(max-width: 768px) 86px, 140px' : source.endsWith('/value-ticket.png') ? '24px' : source.includes('home-link') ? '36px' : '48px';
 attributes=attributes.replace(/\s*data-orbit-image="true"/,'');
 if(icon && !large)attributes+=` srcset="${asset.srcset}" sizes="${sizes}"`;
 if(!attributes.includes('decoding='))attributes+=' decoding="async"';
 if(!attributes.includes('draggable='))attributes+=' draggable="false"';
 if(!attributes.includes('loading='))attributes+=attributes.includes('pop-frame') ? ' loading="lazy"' : ' loading="eager"';
 return `<img${attributes} />`;
});
await writeFile(path.join(publicRoot,'index.html'),html);
console.log(`Build OK: ${cssSources.length} stylesheet sources → 1 request; ${cssName}, ${jsName}.`);

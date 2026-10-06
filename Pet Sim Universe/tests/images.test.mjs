import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PETS,CHARMS,EGGS,ITEMS,SOURCE_PRESETS} from '../public/data/catalog.js';
import {validImagePath,imageSources} from '../admin/public/image-path.js';
import {loadImage} from '../admin/public/image-loader.js';
import {github} from '../admin/github.js';
const ref='a'.repeat(40),signature=[137,80,78,71,13,10,26,10];

class ImageElement extends EventTarget {
  dataset={};hidden=false;history=[];
  set src(value){this.history.push(value);this.url=value;}
  get src(){return this.url;}
  removeAttribute(name){if(name==='src')this.url=undefined;}
  fire(event){this.dispatchEvent(new Event(event));}
}

test('every catalog, variant and source image resolves to an existing PNG accepted by the admin',async()=> {
  const paths=new Set(Object.values(SOURCE_PRESETS).map(item=>item.image));
  for(const item of [...PETS,...CHARMS,...EGGS,...ITEMS]) {
    assert.ok(item.image||item.variantImages?.normal,'Normal artwork missing: '+item.id);
    for(const path of [item.image,...Object.values(item.variantImages||{}),...(item.dropSources||[]).map(source=>source.image)].filter(Boolean))paths.add(path);
  }
  assert.ok(paths.size>=80);
  for(const path of paths) {
    assert.ok(validImagePath(path),'Rejected catalog image: '+path);
    const bytes=await readFile(new URL('../public/'+path,import.meta.url));
    assert.deepEqual([...bytes.subarray(0,8)],signature,'Not a PNG: '+path);
    assert.ok(bytes.length<=8388608,'Image exceeds fallback limit: '+path);
    assert.equal(decodeURIComponent(new URL(imageSources({path,ref})[0]).pathname),'/'+path);
  }
});
test('safe filenames preserve spaces, case, Unicode and parentheses while unsafe paths are rejected',()=> {
  for(const path of ['assets/items/FishingCharm I.png','assets/pets/Kraken.png','assets/pets/Świetny Pet (1).PNG'])assert.ok(validImagePath(path));
  for(const path of [null,'assets/pets/../items/worm.png','assets/pets/.hidden.png','assets/pets/folder/pet.png','assets/pets/back\\slash.png','assets/pets/pet.png?query','assets/pets/pet.png#fragment','assets/pets/pet%20one.png','assets/pets/pet\n.png','assets/pets/pet"name.png','assets/pets/<pet>.png','https://other.example/pet.png','data:image/png;base64,AAAA','assets/other/pet.png'])assert.equal(validImagePath(path),false,String(path));
  const path='assets/items/FishingCharm I.png',sources=imageSources({path,ref});
  const live=new URL(sources[0]);assert.equal(live.pathname,'/assets/items/FishingCharm%20I.png');assert.equal(live.searchParams.get('admin_ref'),ref);
  const fallback=new URL(sources[1],'https://admin.example');assert.equal(fallback.origin,'https://admin.example');assert.equal(fallback.searchParams.get('path'),path);assert.equal(fallback.searchParams.get('ref'),ref);
  assert.equal(imageSources({path,ref:'main'}).length,1);
  assert.equal(new URL(imageSources({path,site:'javascript:alert(1)'})[0]).origin,'https://petuniverse-values.pl');
});
test('an unavailable public PNG falls back once to the authenticated repository image and displays it',()=> {
  const img=new ImageElement();let missing=0;loadImage(img,{path:'assets/items/FishingCharm I.png',ref},()=>missing++);
  assert.match(img.src,/FishingCharm%20I\.png/);img.fire('error');assert.match(img.src,/^\/api\/image\?/);
  img.fire('load');assert.equal(img.hidden,false);assert.equal(img.dataset.imageState,'ready');assert.equal(missing,0);assert.equal(img.history.length,2);
});
test('missing images preserve a visible placeholder without an endless retry loop',()=> {
  const img=new ImageElement();let placeholder=false;loadImage(img,{path:'assets/items/worm.png',ref},()=>placeholder=true);
  img.fire('error');img.fire('error');img.fire('error');assert.equal(img.hidden,true);assert.equal(placeholder,true);assert.equal(img.dataset.imageState,'missing');assert.equal(img.history.length,2);
  const unsafe=new ImageElement();loadImage(unsafe,{path:'https://other.example/pet.png',ref});assert.equal(unsafe.history.length,0);assert.equal(unsafe.dataset.imageState,'missing');
});
test('a new upload preview replaces old image handlers and is not retried against an old asset',()=> {
  const img=new ImageElement();let oldMissing=0;loadImage(img,{path:'assets/items/worm.png',ref},()=>oldMissing++);
  const preview='data:image/png;base64,iVBORw0KGgo=';loadImage(img,{preview});img.fire('load');assert.equal(img.src,preview);assert.equal(img.hidden,false);
  img.fire('error');assert.equal(img.src,preview);assert.equal(oldMissing,0);assert.equal(img.history.length,2);
});
test('raw GitHub delivery accepts PNGs over 1 MB without the contents base64 limit',async()=> {
  const bytes=new Uint8Array(1100000);bytes.set(signature);
  const api=github({GITHUB_TOKEN:'private'},async(url,options)=> {
    assert.equal(options.headers.accept,'application/vnd.github.raw+json');assert.match(url,/FishingCharm%20III\.png/);return new Response(bytes);
  });
  assert.equal((await api.image('assets/items/FishingCharm III.png',ref)).length,bytes.length);
});
test('repository image fallback rejects non-PNG, oversized and redirected responses',async()=> {
  const api=response=>github({GITHUB_TOKEN:'private'},async()=>response);
  await assert.rejects(()=>api(new Response('<html>not an image</html>')).image('assets/items/worm.png',ref),error=>error.status===502 && /not a PNG/.test(error.message));
  await assert.rejects(()=>api(new Response(new Uint8Array(8388609))).image('assets/items/worm.png',ref),error=>error.status===413);
  await assert.rejects(()=>api(new Response(null,{status:302,headers:{location:'https://other.example/private'}})).image('assets/items/worm.png',ref),error=>error.status===502 && /redirect/.test(error.message));
});

import {imageSources} from './image-path.js';
const bindings=new WeakMap();
export function loadImage(img,options,onMissing=()=>{}) {
  bindings.get(img)?.();
  const sources=imageSources(options);let index=0;
  const loaded=()=>{img.hidden=false;img.dataset.imageState='ready';};
  const missing=()=>{img.hidden=true;img.dataset.imageState='missing';onMissing();};
  const failed=()=>{if(++index<sources.length){img.hidden=false;img.src=sources[index];}else missing();};
  img.addEventListener('load',loaded);img.addEventListener('error',failed);
  bindings.set(img,()=>{img.removeEventListener('load',loaded);img.removeEventListener('error',failed);});
  img.dataset.imageState='loading';img.hidden=false;
  if(sources.length)img.src=sources[0];else{img.removeAttribute('src');missing();}
}

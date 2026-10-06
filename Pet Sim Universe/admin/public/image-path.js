// Shared by the editor and Worker. Preserve the repository's exact filename.
export function validImagePath(path) {
  if(typeof path!=='string' || path.length>240)return false;
  const match=/^assets\/(?:pets|charms|eggs|items|sources)\/([^/]+)$/.exec(path);
  if(!match)return false;
  const name=match[1];
  return /\.png$/i.test(name) && !name.startsWith('.') && !/[\\\u0000-\u001f\u007f?#%<>"]/.test(name);
}
export const validImageRef=ref=>typeof ref==='string' && /^[a-f0-9]{40}$/.test(ref);
export const encodeAssetPath=path=>path.split('/').map(encodeURIComponent).join('/');
export function imageSources({path,ref,site='https://petuniverse-values.pl',preview}={}) {
  if(typeof preview==='string' && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(preview))return [preview];
  if(!validImagePath(path))return [];
  let base;try{base=new URL(site);if(base.protocol!=='https:' || base.username || base.password)throw new Error();}catch{base=new URL('https://petuniverse-values.pl');}
  const live=new URL('/'+encodeAssetPath(path),base.origin);
  if(validImageRef(ref))live.searchParams.set('admin_ref',ref);
  const sources=[live.href];
  if(validImageRef(ref))sources.push('/api/image?'+new URLSearchParams({path,ref}));
  return sources;
}

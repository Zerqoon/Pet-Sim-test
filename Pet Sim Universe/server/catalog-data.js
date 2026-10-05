// A deliberately small, non-executing reader for the project's metadata.
// Only literals and previously declared SOURCE_PRESETS properties are accepted.
export function readCatalog(source) {
  if (typeof source !== 'string' || source.length > 200000) throw new Error('Catalog is too large.');
  let i = 0; const exports = Object.create(null);
  const fail = () => { throw new Error(`Invalid catalog near character ${i}. No code was executed.`); };
  function skip() {
    while (i < source.length) {
      if (/\s/.test(source[i])) { i++; continue; }
      if (source.startsWith('//', i)) { const end = source.indexOf('\n', i); i = end < 0 ? source.length : end; continue; }
      if (source.startsWith('/*', i)) { const end = source.indexOf('*/', i + 2); if (end < 0) fail(); i = end + 2; continue; }
      break;
    }
  }
  function str() {
    const q = source[i++]; let s = '';
    while (i < source.length) {
      let c = source[i++]; if (c === q) return s;
      if (c === '\n' || c === '\r') fail();
      if (c === '\\') {
        c = source[i++];
        if (c === 'u' || c === 'x') { const n = c === 'u' ? 4 : 2, hex = source.slice(i, i+n); if (!new RegExp(`^[a-f0-9]{${n}}$`, 'i').test(hex)) fail(); s += String.fromCharCode(parseInt(hex,16)); i+=n; continue; }
        const escapes = { n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', v:'\v', '0':'\0' };
        if (!Object.hasOwn(escapes,c) && !['\\',"'",'"','/'].includes(c)) fail(); s += escapes[c] ?? c;
      } else s += c;
    } fail();
  }
  function identifier() { const m = source.slice(i).match(/^[A-Za-z_$][\w$]*/); if (!m) fail(); i += m[0].length; return m[0]; }
  function value(depth=0) {
    if (depth > 12) fail(); skip(); const c = source[i];
    if (c === '"' || c === "'") return str();
    if (c === '[') { i++; const a=[]; skip(); while (source[i] !== ']') { a.push(value(depth+1)); skip(); if(source[i] === ']') break; if(source[i++] !== ',') fail(); skip(); } i++; return a; }
    if (c === '{') {
      i++; const o=Object.create(null); skip();
      while(source[i] !== '}') {
        const k = ['"',"'"].includes(source[i]) ? str() : identifier();
        if (['__proto__','constructor','prototype'].includes(k) || Object.hasOwn(o,k)) fail();
        skip(); if(source[i++] !== ':') fail(); o[k]=value(depth+1); skip();
        if(source[i] === '}') break; if(source[i++] !== ',') fail(); skip();
      } i++; return o;
    }
    if (source.startsWith('SOURCE_PRESETS.',i)) {
      i += 15; const key=identifier(); if(!Object.hasOwn(exports.SOURCE_PRESETS || {},key)) fail(); return structuredClone(exports.SOURCE_PRESETS[key]);
    }
    const m = source.slice(i).match(/^(?:null|true|false|-?(?:(?:0|[1-9]\d*)(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/i);
    if (!m) fail(); i+=m[0].length;
    if(m[0]==='null') return null; if(m[0]==='true') return true; if(m[0]==='false') return false;
    const n=Number(m[0]); if(!Number.isFinite(n)) fail(); return n;
  }
  skip();
  while(i < source.length) {
    if(!source.startsWith('export const ',i)) fail(); i+=13; const key=identifier();
    if(!['SOURCE_PRESETS','PETS','CHARMS','EGGS','ITEMS','CODES','RARITY_ORDER'].includes(key) || Object.hasOwn(exports,key)) fail();
    skip(); if(source[i++] !== '=') fail(); exports[key]=value(); skip(); if(source[i]===';') i++; skip();
  }
  for(const key of ['PETS','CHARMS','EGGS','ITEMS','CODES']) if(!Array.isArray(exports[key])) fail();
  return exports;
}
export const catalogGroups = data => ({pets:data.PETS, charms:data.CHARMS, eggs:data.EGGS, items:data.ITEMS});
export const writeCatalog = data => '// Metadata and artwork. Prices are stored only in prices.js.\n' + ['SOURCE_PRESETS','PETS','CHARMS','EGGS','CODES','ITEMS','RARITY_ORDER'].filter(k=>Object.hasOwn(data,k)).map(k=>`export const ${k} = ${JSON.stringify(data[k],null,2)};\n`).join('\n');

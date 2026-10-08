import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildValueFeed, handleValueApi, searchValues } from '../lib/value-api.js';

const root = new URL('../', import.meta.url);
const published = Object.fromEntries(await Promise.all(['catalog','prices','price-updates'].map(async name => [name, await readFile(new URL(`public/data/${name}.js`, root), 'utf8')])));
function context(query = '', method = 'GET', files = published) {
  let reads = 0;
  return { request: new Request(`https://values.example/api/v1/value${query}`, { method }), env: {},
    fetcher: async input => { reads++; const name = new URL(input).pathname.match(/^\/data\/(catalog|prices|price-updates)\.js$/)?.[1];
      return new Response(name && files[name] || '', { status: name && files[name] ? 200 : 404 }); },
    reads: () => reads };
}
const decode = response => response.json();
function smallCatalog(pets, charms = []) {
  return ['PETS','CHARMS','EGGS','ITEMS','CODES'].map((key, i) => `export const ${key} = ${JSON.stringify([pets,charms,[],[],[]][i])};`).join('\n');
}
const smallPrices = pets => `export const PRICES = ${JSON.stringify({ pets, charms: {}, eggs: {}, items: {} })};`;
const pet = (id, name, variants = false) => ({ id, name, rarity: 'Exclusive', image: `assets/pets/${id}.png`, supportsVariants: variants,
  ...(variants ? { variantImages: { normal: `assets/pets/${id}.png`, golden: `assets/pets/${id}-golden.png`, diamond: `assets/pets/${id}-diamond.png` } } : {}) });

test('API exposes all 76 original variants, normalized value and author timestamp', async () => {
  const feed = await buildValueFeed(published.catalog, published.prices, published['price-updates']);
  assert.equal(feed.total, 76); assert.equal(feed.items.filter(item => item.priceStatus === 'priced').length, 69);
  assert.equal(feed.updatedAt, '2026-10-08T11:21:03.503Z');
  assert.equal(feed.items.find(item => item.id === 'gummy-bear').value, 16500);
  assert.equal(feed.items.find(item => item.id === 'gummy-bear').display, '16.5K');
  assert.equal(feed.items.find(item => item.id === 'gummy-bear').image, '/assets/pets/gummy-bear.png');
});
test('numeric zero, owner choice and unpriced variants remain separate states', async () => {
  const feed = await buildValueFeed(smallCatalog([pet('test','Test',true)]), smallPrices({ test: { normal: 0, golden: 'O/C', diamond: null } }), null);
  assert.deepEqual(feed.items.map(({ value, display, priceStatus }) => ({ value, display, priceStatus })), [
    { value: 0, display: '0', priceStatus: 'priced' }, { value: null, display: 'O/C', priceStatus: 'owner_choice' }, { value: null, display: 'Not Price', priceStatus: 'unpriced' }]);
  assert.equal(feed.items[1].image, '/assets/pets/test-golden.png'); assert.equal(feed.updatedAt, null);
});
test('a changed published price reaches the API without build or an invented date', async () => {
  const price = published.prices.replace('"gummy-bear": "16.5K"','"gummy-bear": "17K"'); assert.notEqual(price,published.prices);
  const feed = await decode(await handleValueApi(context('?id=gummy-bear','GET',{ ...published, prices: price }), 'value'));
  assert.equal(feed.item.value, 17000); assert.equal(feed.updatedAt, null);
});
test('lookup accepts punctuation and case and returns the correct absolute artwork', async () => {
  const response = await handleValueApi(context('?name=gUmMy%20BEAR'), 'value'); assert.equal(response.status, 200);
  const body = await decode(response); assert.equal(body.item.id, 'gummy-bear'); assert.equal(body.item.image, 'https://values.example/assets/pets/gummy-bear.png');
});
test('selected Golden and Diamond lookup returns that variant artwork and price', async () => {
  for (const variant of ['golden','diamond']) {
    const response = await handleValueApi(context(`?id=sunken-eel&variant=${variant}`),'value');
    assert.equal(response.status,200); const body=await decode(response); assert.equal(body.item.variant,variant);
    assert.ok(body.item.image.endsWith(`sunken-eel-${variant}.png`));
  }
});
test('unsupported variants are explicit errors rather than Normal prices', async () => {
  const response=await handleValueApi(context('?id=gummy-bear&variant=golden'),'value'); assert.equal(response.status,422);
  assert.equal((await decode(response)).error.code,'variant_unavailable');
});
test('partial and unknown names return suggestions without pricing an arbitrary pet', async () => {
  const response=await handleValueApi(context('?name=gummy'),'value'); assert.equal(response.status,404);
  const body=await decode(response); assert.equal(body.error.code,'not_found'); assert.ok(body.error.suggestions.length>1); assert.equal(body.item,undefined);
});
test('duplicate exact names require a category or canonical ID', async () => {
  const files={catalog:smallCatalog([pet('first','Twin'),pet('second','Twin')]),prices:smallPrices({first:1,second:2})};
  const response=await handleValueApi(context('?name=Twin','GET',files),'value'); assert.equal(response.status,409);
  const exact=await decode(await handleValueApi(context('?id=second','GET',files),'value')); assert.equal(exact.item.value,2);
});
test('search ranks names, filters collections and only lists each card once', async () => {
  const feed=await buildValueFeed(published.catalog,published.prices,null);
  assert.equal(searchValues(feed,'gummy bear','pets')[0].id,'gummy-bear');
  assert.ok(searchValues(feed,'','pets').length<=25); assert.ok(searchValues(feed,'','charms').every(item=>item.category==='charms'));
  const ctx=context('?q=sunken&category=pets'); const body=await decode(await handleValueApi(ctx,'search'));
  assert.equal(body.items.length,1); assert.equal(body.items[0].id,'sunken-eel');
});
test('the complete feed can be filtered by collection without modifying source files', async () => {
  const response=await handleValueApi(context('?category=eggs'),'values'); const body=await decode(response);
  assert.equal(body.total,4); assert.ok(body.items.every(item=>item.category==='eggs'));
});
test('bad categories, variants, repeated parameters and excessive inputs are rejected before reads', async () => {
  for(const query of ['?id=test&category=other','?id=test&variant=rainbow','?id=test&id=other','?name='+ 'a'.repeat(181),'?name=test&id=test']) {
    const ctx=context(query); const response=await handleValueApi(ctx,'value'); assert.equal(response.status,400); assert.equal(ctx.reads(),0);
  }
});
test('the API permits only GET/HEAD/OPTIONS and CORS does not expose any write operation', async () => {
  const post=context('?id=gummy-bear','POST'); const denied=await handleValueApi(post,'value'); assert.equal(denied.status,405); assert.equal(post.reads(),0);
  const options=context('','OPTIONS'); const cors=await handleValueApi(options); assert.equal(cors.status,204); assert.equal(options.reads(),0);
  assert.equal(cors.headers.get('access-control-allow-origin'),'*');
  const head=await handleValueApi(context('?id=gummy-bear','HEAD'),'value'); assert.equal(head.status,200); assert.equal(await head.text(),'');
  assert.equal(head.headers.get('cache-control'),'no-store');
});
test('malformed published data gives an unavailable response without running code', async () => {
  globalThis.__apiExecuted=false;
  const files={...published,prices:'globalThis.__apiExecuted=true; export const PRICES = {};'};
  const response=await handleValueApi(context('?id=gummy-bear','GET',files),'value'); assert.equal(response.status,503);
  assert.equal(globalThis.__apiExecuted,false); delete globalThis.__apiExecuted;
});
test('unsafe artwork and an incomplete price snapshot reject the entire API feed', async () => {
  await assert.rejects(buildValueFeed(smallCatalog([{...pet('test','Test'),image:'https://evil.example/test.png'}]),smallPrices({test:1}),null),/artwork/);
  await assert.rejects(buildValueFeed(smallCatalog([pet('test','Test',true)]),smallPrices({test:{normal:1}}),null),/Missing price/);
});
test('a mixed deployment retries and a newly added card appears in the completed snapshot', async () => {
  const old=smallCatalog([pet('one','One')]); const next=smallCatalog([pet('one','One'),pet('two','Two')]);
  let catalogReads=0;
  const ctx={ request:new Request('https://values.example/api/v1/values'),env:{},fetcher:async input=>{
    const path=new URL(input).pathname;
    if(path.endsWith('/catalog.js')) return new Response(++catalogReads===1?old:next);
    if(path.endsWith('/prices.js'))return new Response(smallPrices({one:1,two:2}));
    return new Response('',{status:404});
  }};
  const response=await handleValueApi(ctx); assert.equal(response.status,200); assert.equal(catalogReads,2);
  assert.equal((await decode(response)).items[1].id,'two');
});
test('Cloudflare asset binding reads only the three published data files', async () => {
  const paths=[];
  const ctx={request:new Request('https://values.example/api/v1/values'),env:{ASSETS:{fetch:async request=>{
    paths.push(new URL(request.url).pathname); return context().fetcher(request.url);
  }}}};
  const response=await handleValueApi(ctx); assert.equal(response.status,200);
  assert.deepEqual(paths.sort(),['/data/catalog.js','/data/price-updates.js','/data/prices.js']);
});

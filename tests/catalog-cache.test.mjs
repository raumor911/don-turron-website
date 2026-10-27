import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCatalogCache} from '../api/catalog-cache.js';

test('concurrent readers coalesce to one DB request and reuse briefly',async()=>{
  let now=1000,calls=0;
  const cache=createCatalogCache({ttlMs:5000,now:()=>now});
  const load=async()=>{calls++;await Promise.resolve();return {products:[{id:'sample',stock:3}]};};
  const results=await Promise.all(Array.from({length:40},()=>cache.read(load)));
  assert.equal(calls,1);
  assert.ok(results.every(r=>r===results[0]));
  assert.equal((await cache.read(load)).products[0].stock,3);
  assert.equal(calls,1);
  now+=4900;
  assert.equal((await cache.read(load)).products[0].stock,3);
  assert.equal(calls,1);
  now+=100;
  assert.equal((await cache.read(load)).products[0].stock,3);
  assert.equal(calls,2);
});
test('stock refresh after TTL and does not retain stale value',async()=>{
  let now=0,calls=0,stock=2;
  const cache=createCatalogCache({ttlMs:5000,now:()=>now});
  const loader=async()=>{calls++;return {stock};};
  assert.equal((await cache.read(loader)).stock,2);
  stock=0;
  assert.equal((await cache.read(loader)).stock,2,'TTL intentionally limited to five seconds');
  now=5000;
  assert.equal((await cache.read(loader)).stock,0);
  assert.equal(calls,2);
});
test('failed refresh invalidates stale stock and applies 1s DB retry cooldown',async()=>{
  let now=0,calls=0,fail=false;
  const cache=createCatalogCache({ttlMs:5000,errorCooldownMs:1000,now:()=>now});
  const loader=async()=>{calls++;if(fail)throw Error('db_offline');return {stock:4};};
  assert.equal((await cache.read(loader)).stock,4);
  fail=true;
  now=5000;
  await assert.rejects(()=>cache.read(loader),/db_offline/);
  assert.equal(calls,2);
  await assert.rejects(()=>cache.read(loader),/db_offline/);
  assert.equal(calls,2,'do not hammer an unavailable database');
  now=6000;fail=false;
  assert.equal((await cache.read(loader)).stock,4);
  assert.equal(calls,3,'recovery can reload data after retry window');
});
test('read API and browser use conditional 5-second HTTP caching, no stale inventory',()=>{
  const api=fs.readFileSync(new URL('../api/catalog.js',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(api,/snapshotCache\.read/);
  assert.match(api,/max-age=5, s-maxage=5, must-revalidate/);
  assert.match(api,/If-None-Match|if-none-match/);
  assert.match(api,/res\.status\(304\)\.end\(\)/);
  assert.doesNotMatch(api,/stale-while-revalidate/);
  assert.match(browser,/fetch\('\/api\/catalog',\{method:'GET',credentials:'omit',signal:abort\.signal,cache:'default'\}\)/);
  assert.ok(browser.includes('liveCatalogEnabled'));
});

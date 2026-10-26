import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {release,validateRelease,publishMetadata,absoluteSchema} from '../scripts/dt-semantic/release.mjs';
test('publication cannot activate checkout, Offers or IndexNow',()=>{
  for(const flag of ['enableCommerce','publishOffers','indexNow'])assert.throws(()=>validateRelease({...release,[flag]:true}));
  assert.throws(()=>validateRelease({...release,verifiedDomain:'http://www.donturron.com.mx'}));
  assert.throws(()=>validateRelease({...release,verifiedDomain:'https://www.donturron.com.mx/path'}));
  assert.throws(()=>validateRelease({...release,mode:'prelaunch'}));
});
test('canonical metadata is idempotent and uses only the configured origin',()=>{
  const source='<head><meta name="robots" content="noindex, nofollow"></head>';
  const html=publishMetadata(source,'/productos/estuche-viaje/');
  assert.equal(publishMetadata(html,'/productos/estuche-viaje/'),html);
  assert.match(html,/https:\/\/www.donturron.com.mx\/productos\/estuche-viaje\//);
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
  assert.deepEqual(absoluteSchema({image:'../../assets/products/estuche-6-interior.webp'},'/productos/estuche-viaje/'),{image:'https://www.donturron.com.mx/assets/products/estuche-6-interior.webp'});
});
test('combined CSS preserves exact source order',()=>{
  const css=fs.readFileSync('site.css','utf8');
  assert.equal(css,['fonts.css','styles.css','premium.css','gallery.css'].map(p=>fs.readFileSync(p,'utf8')).join('\n'));
});
test('local fonts match the verified production binaries and are preloaded',()=>{
  const manifest=JSON.parse(fs.readFileSync('assets/fonts/manifest.json','utf8'));
  const home=fs.readFileSync('index.html','utf8');
  assert.equal(manifest.length,3);
  assert.doesNotMatch(home,/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  for(const f of manifest){
    const binary=fs.readFileSync('assets/fonts/'+f.file);
    assert.equal(binary.subarray(0,4).toString(),'wOF2');
    assert.equal(crypto.createHash('sha256').update(binary).digest('hex'),f.sha256);
    assert.match(home,new RegExp('as="font"[^>]+assets/fonts/'+f.file));
  }
});

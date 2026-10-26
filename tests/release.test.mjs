import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
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
  assert.equal(css,['styles.css','premium.css','gallery.css'].map(p=>fs.readFileSync(p,'utf8')).join('\n'));
});

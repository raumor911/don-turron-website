import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.js';

test('Hostinger Node.js serves SEO pages, catalog API and public assets without source exposure',async t=>{
  const app=createApp();
  const server=await new Promise((resolve,reject)=>{
    const s=app.listen(0,'127.0.0.1',()=>resolve(s));
    s.once('error',reject);
  });
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const request=(path,init)=>fetch(base+path,init);

  const home=await request('/');
  assert.equal(home.status,200);
  const html=await home.text();
  assert.match(html,/name="robots" content="index, follow"/);
  assert.match(html,/rel="canonical" href="https:\/\/www.donturron.com.mx\//);
  assert.equal((await request('/index.html')).status,200);

  const [product,guide,sitemap,robots,image,css,client,ai,llms]=await Promise.all([
    request('/productos/estuche-viaje/'),request('/guia/estuche-o-humidor/'),
    request('/sitemap.xml'),request('/robots.txt'),request('/assets/don-turron-emblema.jpg'),
    request('/site.css'),request('/app.js'),request('/ai/products.json'),request('/llms.txt')
  ]);
  for(const [name,result] of [['product',product],['guide',guide],['sitemap',sitemap],
    ['robots',robots],['image',image],['css',css],['client',client],['AI',ai],['llms',llms]]){
    assert.equal(result.status,200,'Public '+name+' must return HTTP 200');
  }
  const productHtml=await product.text();
  assert.match(productHtml,/name="robots" content="index, follow"/);
  assert.match(productHtml,/rel="canonical"/);
  assert.equal((await sitemap.text()).match(/<loc>/g).length,10);
  assert.match(await robots.text(),/Allow: \/\s/);
  assert.doesNotMatch(await (await request('/robots.txt')).text(),/Disallow: \/\s/);

  for(const path of ['/database/001_schema.sql','/knowledge/products.json',
    '/telemetry/receiver.mjs','/server.js','/api/catalog.js',
    '/package.json','/.git/config','/.env','/scripts/dt-semantic/compile.mjs',
    '/does-not-exist']){
    assert.equal((await request(path)).status,404,'Private or unknown path must be closed: '+path);
  }

  const health=await request('/api/healthz');
  assert.equal(health.status,200);
  assert.deepEqual(await health.json(),{status:'ok',service:'don-turron'});

  const post=await request('/api/catalog',{method:'POST'});
  assert.equal(post.status,405);
  assert.equal((await post.json()).error,'method_not_allowed');
  if(!process.env.DT_DB_HOST){
    const unavailable=await request('/api/catalog');
    assert.equal(unavailable.status,503,'MySQL missing must not crash web server');
    assert.equal((await unavailable.json()).error,'catalog_unavailable');
  }
  const telemetry=await request('/api/telemetry/config');
  assert.equal(telemetry.status,200,'Preserve existing telemetry config endpoint');
  const telemetryConfig=await telemetry.json();
  assert.equal(telemetryConfig.site_id,'don-turron');
  if(!process.env.TELEMETRY_ENABLED)assert.equal(telemetryConfig.enabled,false);
});

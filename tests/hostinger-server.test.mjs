import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApp} from '../server.js';
const seed=JSON.parse(fs.readFileSync(new URL('../knowledge/products.json',import.meta.url),'utf8'));
const catalogSnapshot=(products=seed)=>({body:{version:1,source:'don-turron-inventory',products}});

test('Hostinger Node.js serves SEO pages, catalog API and public assets without source exposure',async t=>{
  const app=createApp({readCatalog:async()=>catalogSnapshot()});
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
  assert.equal((await sitemap.text()).match(/<loc>/g).length,seed.length+2);
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

test('RAUVIA-style Hostinger build keeps private source out of dist/public',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const publicRoot=path.join(root,'dist','public');
  const entry=path.join(root,'dist','server.cjs');
  assert.ok(fs.statSync(entry,{throwIfNoEntry:false})?.isFile(),'Node entry must be built before server start');
  assert.ok(fs.statSync(path.join(publicRoot,'index.html'),{throwIfNoEntry:false})?.isFile(),'Public home must be built');
  assert.ok(fs.statSync(path.join(publicRoot,'sitemap.xml'),{throwIfNoEntry:false})?.isFile(),'Sitemap must be in public bundle');
  const sitemap=fs.readFileSync(path.join(publicRoot,'sitemap.xml'),'utf8');
  assert.equal((sitemap.match(/<loc>/g)||[]).length,10);
  for(const name of ['database','knowledge','telemetry','scripts','tests','node_modules','.env','server.js','package.json']){
    assert.equal(fs.existsSync(path.join(publicRoot,name)),false,'Private path leaked into public build: '+name);
  }
  assert.match(fs.readFileSync(entry,'utf8'),/import\('\.\.\/server\.js'\)/);
});

test('SSR, product URLs, sitemaps and LLMO recognize MySQL product additions and removal',async t=>{
  let products=seed.slice();
  const app=createApp({readCatalog:async()=>catalogSnapshot(products)});
  const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port;
  const fresh={
    ...seed[0],id:'nuevo-accesorio',name:'Nuevo accesorio de Kyberion',category:'accesorios-nuevos',
    categoryLabel:'Accesorios nuevos',stock:0,
    images:[],art:'case',variants:[],description:'Descripción actualizada desde MySQL',
    retailPrice:{amount:1234,currency:'MXN',taxIncluded:true,shippingIncluded:false}
  };
  products=[...seed.filter(p=>p.id!=='cenicero-mesa'),fresh];
  const home=await fetch(url+'/');
  assert.equal(home.status,200);
  const html=await home.text();
  assert.match(html,/Nuevo accesorio de Kyberion/);
  assert.match(html,/\$1,234 MXN/);
  assert.match(html,/Agotado/);
  assert.doesNotMatch(html,/data-id="cenicero-mesa"/);
  assert.match(html,/window.DON_TURRON_CATALOG=/);
  assert.doesNotMatch(html,/<script defer src="catalog.js"><\/script>/);
  const details=await fetch(url+'/productos/nuevo-accesorio/');
  assert.equal(details.status,200);
  const productHtml=await details.text();
  assert.match(productHtml,/<h1 class="dt-title">Nuevo accesorio de Kyberion<\/h1>/);
  assert.match(productHtml,/Descripción actualizada desde MySQL/);
  assert.match(productHtml,/rel="canonical" href="https:\/\/www.donturron.com.mx\/productos\/nuevo-accesorio\/"/);
  const hidden=await fetch(url+'/productos/cenicero-mesa/');
  assert.equal(hidden.status,404);
  assert.equal(hidden.headers.get('x-robots-tag'),'noindex');
  assert.equal((await fetch(url+'/productos/cenicero-mesa/index.html')).status,404,
    'Legacy static product URL must never expose a hidden product');
  const xml=await (await fetch(url+'/sitemap.xml')).text();
  assert.match(xml,/productos\/nuevo-accesorio\//);
  assert.doesNotMatch(xml,/productos\/cenicero-mesa\//);
  const ai=await (await fetch(url+'/ai/products.json')).json();
  assert.ok(ai.products.some(p=>p.id==='nuevo-accesorio'));
  assert.ok(!ai.products.some(p=>p.id==='cenicero-mesa'));
  const md=await (await fetch(url+'/ai/catalog.md')).text();
  assert.match(md,/Nuevo accesorio de Kyberion/);
  assert.doesNotMatch(md,/cenicero-mesa/);
  const graph=await (await fetch(url+'/ai/knowledge-graph.json')).json();
  assert.ok(graph.nodes.some(n=>n.name==='Nuevo accesorio de Kyberion'));
  assert.ok(graph.nodes.some(n=>n.type==='UseCase'),'Preserve AETHRYON use cases');
  assert.ok(graph.nodes.some(n=>n.type==='Source'),'Preserve AETHRYON supporting sources');
  assert.ok(!graph.nodes.some(n=>n.type==='Product'&&n.id==='cenicero-mesa'),
    'Hidden product must not survive in knowledge graph');
  products=[];
  const empty=await (await fetch(url+'/sitemap.xml')).text();
  assert.doesNotMatch(empty,/\/productos\//);
  assert.equal((await (await fetch(url+'/ai/products.json')).json()).products.length,0);
});

test('MySQL outage prevents publishing obsolete stock/prices or hidden products as SEO',async t=>{
  const app=createApp({readCatalog:async()=>{throw Error('database offline')}});
  const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const home=await fetch(base+'/');
  assert.equal(home.status,200);
  assert.equal(home.headers.get('x-robots-tag'),'noindex');
  const html=await home.text();
  assert.doesNotMatch(html,/data-id="cenicero-mesa"/);
  assert.match(html,/window.DON_TURRON_CATALOG=\[\]/);
  assert.equal((await fetch(base+'/sitemap.xml')).status,503);
  assert.equal((await fetch(base+'/productos/estuche-viaje/')).status,503);
});

test('Out of stock remains publicly visible without stale availability claims',async t=>{
  const productId='cenicero-mesa';
  const products=seed.map(p=>p.id===productId?{
    ...p,publicationStatus:'Out of stock',
    stock:3,variants:[],retailPrice:{amount:549,currency:'MXN',taxIncluded:true}
  }:p);
  const app=createApp({readCatalog:async()=>catalogSnapshot(products)});
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port;
  const home=await (await fetch(url+'/')).text();
  const card=home.match(/<article class="product-card" data-id="cenicero-mesa">[\s\S]*?<\/article>/)?.[0]||'';
  assert.match(card,/Agotado/);
  assert.match(card,/\$549 MXN/);
  assert.match(card,/data-add="cenicero-mesa" disabled title="Agotado"/);
  assert.doesNotMatch(card,/3 unidades disponibles/);
  const detail=await fetch(url+'/productos/cenicero-mesa/');
  assert.equal(detail.status,200);
  const page=await detail.text();
  assert.match(page,/Agotado/);
  assert.match(page,/\$549 MXN/);
  assert.doesNotMatch(page,/Inventario registrado: 3/);
  const sitemap=await (await fetch(url+'/sitemap.xml')).text();
  assert.match(sitemap,/\/productos\/cenicero-mesa\//);
  const ai=await (await fetch(url+'/ai/catalog.md')).text();
  assert.match(ai,/Agotado/);
});

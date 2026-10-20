import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load,validate } from './validate.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const k=load();validate(k);
const cat=read('catalog.js'),home=read('index.html');
const json=JSON.parse(read('ai/products.json')),kg=JSON.parse(read('ai/knowledge-graph.json'));
const ids=k.products.map(p=>p.id);
if(!ids.every(id=>cat.includes('"id": "'+id+'"')))throw new Error('Catalog diverges from knowledge');
const retailMap=new Map(k.products.filter(p=>p.retailPrice).map(p=>[p.id,p.retailPrice.amount]));
if(retailMap.size!==5)throw new Error('Only five priced accessories allowed');
for(const p of k.products){
  const source=p.retailPrice;
  const publicRecord=json.products.find(x=>x.id===p.id);
  if(source){
    const displayed='$'+source.amount.toLocaleString('es-MX')+' MXN';
    if(!cat.includes('"amount": '+source.amount))throw new Error('Price missing from generated catalog '+p.id);
    if(publicRecord?.retailPrice?.amount!==source.amount||publicRecord?.retailPrice?.taxIncluded!==true||publicRecord?.retailPrice?.shippingIncluded!==false)throw new Error('AI price mismatch '+p.id);
    if(!home.includes('data-id="'+p.id+'"')||!home.includes(displayed))throw new Error('Public homepage price missing '+p.id);
  }else if(publicRecord?.retailPrice!=null)throw new Error('Unpriced launch exposed as priced '+p.id);
}
if(json.products.length!==k.products.length||kg.nodes.filter(n=>n.type==='Product').length!==k.products.length)throw new Error('Graph/catalog count mismatch');
if(!home.includes('noindex, nofollow')||!read('robots.txt').includes('Disallow: /'))throw new Error('Index gate lost');
if(!home.includes('DT-JSONLD-START'))throw new Error('Homepage JSON-LD missing');
const schema=JSON.parse(home.match(/<!-- DT-JSONLD-START -->\s*<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
if(schema['@graph'].some(n=>['Offer','AggregateRating','Review'].includes(n['@type'])))throw new Error('Unsupported markup');
const publicFiles=['llms.txt','llms-full.txt','ai/brand.md','ai/catalog.md','ai/products.json','ai/knowledge-graph.json','ai/intents.json','ai/canonical-answers.md','ai/terminology.md','ai/sources.json','ai/content-manifest.json'];
for(const file of publicFiles){if(!fs.existsSync(path.join(ROOT,file)))throw new Error('Missing output '+file);}
for(const file of ['ai/products.json','ai/knowledge-graph.json','ai/intents.json','ai/sources.json','ai/content-manifest.json'])JSON.parse(read(file));
for(const file of publicFiles){const s=read(file);if(/sk-proj-|BEGIN PRIVATE KEY|acquisitionCost|grossMargin|example\.com/i.test(s))throw new Error('Private value in '+file);}
const retired='encendedor-jet';
if(k.products.some(p=>p.id===retired))throw new Error('Removed phantom product returned in Semantic Core');
for(const rel of ['catalog.js','index.html','ai/products.json','ai/catalog.md','ai/brand.md','llms-full.txt','ai/knowledge-graph.json']){
  if(read(rel).includes(retired))throw new Error('Retired product leaked in public artifact '+rel);
}
const documented=k.products.filter(p=>p.contentStatus==='documented');
for(const p of documented){
  const route='productos/'+p.id+'/index.html';
  const h=read(route);
  if(!h.includes('<h1')||!h.includes(p.name)||!h.includes('noindex, nofollow'))throw new Error('Product HTML missing or not gated: '+route);
  if(!p.images.every(x=>h.includes(x.src)))throw new Error('Missing image in '+route);
  if(p.retailPrice&&!h.includes('$'+p.retailPrice.amount.toLocaleString('es-MX')+' MXN'))throw new Error('Price missing on product page '+p.id);
  if(p.retailPrice&&(!h.includes('IVA incluido')||!h.includes('Envío no incluido')))throw new Error('Tax/shipping note missing '+p.id);
  if(!p.retailPrice&&h.includes('class="dt-retail-price"'))throw new Error('Upcoming product shows price '+p.id);
  const ld=h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if(!ld)throw new Error('Product JSON-LD missing '+route);
  const nodes=JSON.parse(ld[1])['@graph'];
  if(!nodes.some(x=>x['@type']==='Product' && x.name===p.name))throw new Error('Product Schema differs from HTML '+route);
  if(nodes.some(x=>x['@type']==='Offer'||x['@type']==='Review'))throw new Error('Unsupported Product Offer '+route);
}
if(fs.existsSync(path.join(ROOT,'productos/encendedor-jet/index.html')))throw new Error('Conceptual product published with product page');
if(!read('index.html').includes('DT-CATALOG-START')||(home.match(/class="product-card"/g)||[]).length!==k.products.length)throw new Error('Home not prerendered with current product count');
if(!read('guia/estuche-o-humidor/index.html').includes('noindex, nofollow'))throw new Error('Guide not gated');
const gate=JSON.parse(read('semantic-release.json'));
if(gate.mode!=='prelaunch'||gate.enableIndexing!==false||gate.enableCommerce!==false||gate.verifiedDomain!==null)throw new Error('Invalid release gate');
if(fs.existsSync(path.join(ROOT,'sitemap.xml')))throw new Error('Sitemap prohibited before domain verified');
console.log('DT semantic artifacts VALID: '+publicFiles.length+' AI outputs, '+k.products.length+' IDs, '+documented.length+' documented');

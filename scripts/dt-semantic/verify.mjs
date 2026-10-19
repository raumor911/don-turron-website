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
if(json.products.length!==6||kg.nodes.filter(n=>n.type==='Product').length!==6)throw new Error('Graph/catalog count mismatch');
if(!home.includes('noindex, nofollow')||!read('robots.txt').includes('Disallow: /'))throw new Error('Index gate lost');
if(!home.includes('DT-JSONLD-START'))throw new Error('Homepage JSON-LD missing');
const schema=JSON.parse(home.match(/<!-- DT-JSONLD-START -->\s*<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
if(schema['@graph'].some(n=>['Offer','AggregateRating','Review'].includes(n['@type'])))throw new Error('Unsupported markup');
const publicFiles=['llms.txt','llms-full.txt','ai/brand.md','ai/catalog.md','ai/products.json','ai/knowledge-graph.json','ai/intents.json','ai/canonical-answers.md','ai/terminology.md','ai/sources.json','ai/content-manifest.json'];
for(const file of publicFiles){if(!fs.existsSync(path.join(ROOT,file)))throw new Error('Missing output '+file);}
for(const file of ['ai/products.json','ai/knowledge-graph.json','ai/intents.json','ai/sources.json','ai/content-manifest.json'])JSON.parse(read(file));
for(const file of publicFiles){const s=read(file);if(/sk-proj-|BEGIN PRIVATE KEY|acquisitionCost|grossMargin|example\.com/i.test(s))throw new Error('Private value in '+file);}
const documented=k.products.filter(p=>p.contentStatus==='documented');
for(const p of documented){
  const route='productos/'+p.id+'/index.html';
  const h=read(route);
  if(!h.includes('<h1')||!h.includes(p.name)||!h.includes('noindex, nofollow'))throw new Error('Product HTML missing or not gated: '+route);
  if(!p.images.every(x=>h.includes(x.src)))throw new Error('Missing image in '+route);
  const ld=h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if(!ld)throw new Error('Product JSON-LD missing '+route);
  const nodes=JSON.parse(ld[1])['@graph'];
  if(!nodes.some(x=>x['@type']==='Product' && x.name===p.name))throw new Error('Product Schema differs from HTML '+route);
  if(nodes.some(x=>x['@type']==='Offer'||x['@type']==='Review'))throw new Error('Unsupported Product Offer '+route);
}
if(fs.existsSync(path.join(ROOT,'productos/encendedor-jet/index.html')))throw new Error('Conceptual product published with product page');
if(!read('index.html').includes('DT-CATALOG-START')||(home.match(/class="product-card"/g)||[]).length!==6)throw new Error('Home not prerendered with six cards');
if(!read('guia/estuche-o-humidor/index.html').includes('noindex, nofollow'))throw new Error('Guide not gated');
if(fs.existsSync(path.join(ROOT,'sitemap.xml')))throw new Error('Sitemap prohibited before domain verified');
console.log('DT semantic artifacts VALID: '+publicFiles.length+' AI outputs, 6 IDs, 5 documented');

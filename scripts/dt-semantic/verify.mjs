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
if(fs.existsSync(path.join(ROOT,'sitemap.xml')))throw new Error('Sitemap prohibited before domain verified');
console.log('DT semantic artifacts VALID: '+publicFiles.length+' AI outputs, 6 IDs, 5 documented');

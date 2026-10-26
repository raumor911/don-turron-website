import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { load, validate } from './validate.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const release=JSON.parse(fs.readFileSync(path.join(ROOT,'semantic-release.json'),'utf8'));
if(release.mode!=='prelaunch'||release.enableIndexing!==false||release.enableCommerce!==false||release.publishOffers!==false||release.indexNow!==false||release.verifiedDomain!==null)throw new Error('Release gate: only prelaunch without domain or commerce is authorized in V1');
const out=(rel,data)=>{const file=path.join(ROOT,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n','utf8');};
const stable=o=>Array.isArray(o)?o.map(stable):o&&typeof o==='object'?Object.fromEntries(Object.keys(o).sort().map(k=>[k,stable(o[k])])):o;
const hash=o=>crypto.createHash('sha256').update(JSON.stringify(stable(o))).digest('hex');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const publicItem=x=>x.visibility==='public'||x.visibility==='public_preview';
function knowledgeGraph(k,fingerprint){
  const nodes=[],edges=[];const seen=new Set();
  const node=(id,type,name,status)=>{if(!seen.has(id)){nodes.push({id,type,name,...(status?{status}:{})});seen.add(id);}};
  const edge=(source,target,type)=>edges.push({source,target,type});
  node(k.brand.id,'Brand',k.brand.name);
  node(k.organization.id,'Organization',k.organization.name);
  edge(k.organization.id,k.brand.id,'operatesBrand');
  for(const coll of k.collections.filter(publicItem)){node(coll.id,'Collection',coll.name);edge(k.brand.id,coll.id,'hasCollection');}
  for(const cat of k.categories.filter(publicItem)){node(cat.id,'Category',cat.name);edge(cat.collectionId,cat.id,'hasCategory');}
  for(const p of k.products.filter(publicItem)){
    node(p.id,'Product',p.name,p.contentStatus);
    if(p.launchWindow)nodes[nodes.length-1].launchWindow={...p.launchWindow};
    if(p.retailPrice)nodes[nodes.length-1].retailPrice={...p.retailPrice};
    edge(p.categoryId,p.id,'containsProduct');
    for(let i=0;i<p.features.length;i++){const id='feature:'+p.id+':'+(i+1);node(id,'Feature',p.features[i],'supplier_declared');edge(p.id,id,'hasDeclaredFeature');}
  }
  for(const use of k['use-cases'].filter(publicItem)){node(use.id,'UseCase',use.name);for(const id of use.productIds)edge(use.id,id,'mayBeAddressedBy');}
  for(const intent of k.intents.filter(publicItem)){node(intent.id,'Intent',intent.name,intent.status);for(const id of intent.productIds)edge(intent.id,id,'suggestsProduct');for(const id of intent.useCaseIds)edge(intent.id,id,'addressesUseCase');}
  for(const source of k.sources.filter(publicItem))node(source.id,'Source',source.name,source.type);
  for(const claim of k.claims.filter(c=>publicItem(c)&&['verified','supplier_declared'].includes(c.status))){
    node(claim.id,'Claim',claim.statement,claim.status);edge(claim.id,claim.subjectId,'about');for(const id of claim.sourceIds)edge(claim.id,id,'supportedBy');
  }
  const valid=new Set(nodes.map(x=>x.id));
  for(const e of edges)if(!valid.has(e.source)||!valid.has(e.target))throw new Error('Broken public graph: '+JSON.stringify(e));
  return {name:'Don Turrón Semantic Knowledge Graph',version:'1.0.0',fingerprint,nodes,edges};
}
const generalSchema=k=>({
  '@context':'https://schema.org','@graph':[
   {'@type':'Brand','@id':'#brand',name:k.brand.name,slogan:k.brand.tagline,description:k.brand.description},
   {'@type':'Organization','@id':'#organization',name:k.organization.name,description:k.organization.description,brand:{'@id':'#brand'}},
   {'@type':'WebSite','@id':'#website',name:k.brand.name,inLanguage:'es-MX',description:k.brand.description},
   {'@type':'CollectionPage','@id':'#collection',name:'La colección de Don Turrón',description:k.collections[0].description,isPartOf:{'@id':'#website'},mainEntity:{'@id':'#catalog-list'}},
   {'@type':'ItemList','@id':'#catalog-list',name:'Accesorios documentados',numberOfItems:k.products.filter(p=>p.contentStatus!=='conceptual').length,itemListElement:k.products.filter(p=>p.contentStatus!=='conceptual').map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name}))}
  ]});
function writeCatalog(k){
  const products=k.products.map(p=>Object.fromEntries(['id','name','category','categoryLabel','subtitle','description','features','art','badge','images','variants','contentStatus','commercialStatus','launchWindow','retailPrice','manufacturerBrand'].map(field=>[field,p[field]])));
  out('catalog.js','/* AUTOGENERADO desde knowledge/products.json — editar solo el Semantic Core. */\nwindow.DON_TURRON_CATALOG = '+JSON.stringify(products,null,2)+';\n');
}
function writeAi(k,fingerprint,graph){
  const documented=k.products.filter(p=>p.contentStatus!=='conceptual'&&publicItem(p));
  const publicProducts=k.products.filter(publicItem).map(p=>({id:p.id,name:p.name,description:p.description,features:p.features,images:p.images,category:p.category,contentStatus:p.contentStatus,commercialStatus:p.commercialStatus,retailPrice:p.retailPrice??null,manufacturerBrand:p.manufacturerBrand??null,variants:p.variants,launchWindow:p.launchWindow??null,sourceIds:p.sourceIds}));
  const asMd=items=>items.map(x=>'## '+x.question+'\n\n'+x.answer+'\n\nFuentes: '+x.sourceIds.join(', ')).join('\n\n');
  const intro='# Don Turrón\n\n'+k.brand.description+'\n\nLema: '+k.brand.tagline+'\n\nEstado: prelanzamiento sin pedidos ni pagos. Cinco accesorios tienen precio final al público en MXN con IVA incluido y envío por separado. Inventario registrado únicamente para el reposa puros: Plata (2 unidades) y Negro (1 unidad); demás existencias por confirmar. Tres próximos lanzamientos carecen todavía de precio.\n';
  const links=doc=>'- ['+doc.name+'](/productos/'+doc.id+'/)'+(doc.retailPrice?' — $'+doc.retailPrice.amount+' MXN, IVA incluido; envío no incluido.':'')+(doc.launchWindow?' — '+doc.launchWindow.label+'; precio por confirmar.':'');
  const brandMd=intro+'\n'+documented.length+' artículos cuentan con fichas documentadas. Solo la ficha del reposa puros informa existencias registradas; ninguna ficha activa pedidos ni reservas.\n';
  const catalogMd=intro+'\n## Accesorios documentados\n'+documented.map(links).join('\n')+'\n';
  const intentList=k.intents.filter(publicItem).map(i=>({...i,sourceType:'hypothesis_not_measured'}));
  const termMd='# Terminología\n\n'+k.terminology.filter(publicItem).map(x=>'## '+x.term+'\n\n'+x.definition).join('\n\n')+'\n';
  const sourceList=k.sources.filter(publicItem);
  const paths=['llms.txt','llms-full.txt','ai/brand.md','ai/catalog.md','ai/products.json','ai/knowledge-graph.json','ai/intents.json','ai/canonical-answers.md','ai/terminology.md','ai/sources.json','ai/content-manifest.json'];
  out('ai/brand.md',brandMd);out('ai/catalog.md',catalogMd);out('ai/products.json',{products:publicProducts});
  out('ai/knowledge-graph.json',graph);out('ai/intents.json',{notice:'Ejemplos hipotéticos sin volúmenes de búsqueda comprobados',intents:intentList});
  out('ai/canonical-answers.md','# Respuestas canónicas — Don Turrón\n\n'+asMd(k['canonical-answers'].filter(publicItem))+'\n');
  out('ai/terminology.md',termMd);out('ai/sources.json',{sources:sourceList});
  out('llms.txt','# Don Turrón\n\n'+k.brand.description+'\n\n> Prelanzamiento sin pagos ni reservas. Inventario registrado del reposa puros: Plata (2 unidades) y Negro (1 unidad); las demás existencias siguen por confirmar. Cinco productos con precio público final (IVA incluido, envío no incluido); tres próximos lanzamientos sin precio.\n\n- [Marca](/ai/brand.md)\n- [Catálogo](/ai/catalog.md)\n- [Productos](/ai/products.json)\n- [Respuestas](/ai/canonical-answers.md)\n- [Fuentes](/ai/sources.json)\n');
  out('llms-full.txt',brandMd+'\n'+catalogMd+'\n'+asMd(k['canonical-answers'].filter(publicItem))+'\n');
  out('ai/content-manifest.json',{version:1,knowledgeFingerprint:fingerprint,releaseStatus:'prelaunch',files:paths.filter(x=>x!=='ai/content-manifest.json'),generatedFrom:'knowledge/*.json',crawlerNote:'No atribuir visitas ni recomendaciones a asistentes sin evidencia de origen.'});
}
function writeHomepage(schema){
  const file=path.join(ROOT,'index.html');let html=fs.readFileSync(file,'utf8');
  const block='<!-- DT-JSONLD-START -->\n<script type="application/ld+json">'+JSON.stringify(schema)+'</script>\n<!-- DT-JSONLD-END -->';
  if(html.includes('<!-- DT-JSONLD-START -->'))html=html.replace(/<!-- DT-JSONLD-START -->[\s\S]*?<!-- DT-JSONLD-END -->/,block);
  else{
    const source=/<script type="application\/ld\+json">[\s\S]*?<\/script>/;
    if(!source.test(html))throw new Error('Home JSON-LD anchor not found');
    html=html.replace(source,block);
  }
  if(!html.includes('name="robots" content="noindex, nofollow"'))throw new Error('Prelaunch noindex gate missing');
  out('index.html',html);
}
export function generateSitemap(siteUrl,paths=[]){
  if(!siteUrl) return null;
  if(!/^https:\/\/[^\s/]+/.test(siteUrl))throw new Error('Valid HTTPS domain required to release sitemap');
  const origin=new URL(siteUrl).origin;
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+paths.map(p=>'  <url><loc>'+escape(origin+p)+'</loc></url>').join('\n')+'\n</urlset>\n';
}
export function compile(){
  const k=load();validate(k);
  const fingerprint=hash(k);
  writeCatalog(k);
  const graph=knowledgeGraph(k,fingerprint);
  writeAi(k,fingerprint,graph);
  const schema=generalSchema(k);
  writeHomepage(schema);
  // Release gate: do not output sitemap/canonical while siteUrl is unknown.
  if(fs.existsSync(path.join(ROOT,'sitemap.xml')))throw new Error('Prelaunch prohibits sitemap.xml without verified domain');
  console.log('DT-SC-002 compiled; knowledge fingerprint '+fingerprint);
  return {fingerprint,k,graph};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))compile();

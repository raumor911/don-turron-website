import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
export function loadSemantic(rootDir=root){
 // Exact assets from DT Semantic Core PR #4; no independent product registry.
 const read=file=>JSON.parse(fs.readFileSync(path.join(rootDir,file),'utf8'));
 const manifest=read('ai/content-manifest.json');
 const products=read('knowledge/products.json');
 const intents=read('knowledge/intents.json');
 if(!['prelaunch','production'].includes(manifest.releaseStatus)||!Array.isArray(manifest.files)||!manifest.knowledgeFingerprint)throw new Error('semantic_manifest_invalid');
 if(!Array.isArray(products)||products.length<6||new Set(products.map(p=>p.id)).size!==products.length||products.some(p=>p.id==='encendedor-jet')||!products.every(p=>['documented','verified'].includes(p.contentStatus)))throw new Error('semantic_contract_invalid');
 return {manifest,products,intents};
}
export function safePath(raw){
 if(typeof raw!=='string'||raw.length>2048)return '/[invalid]';
 try{
  if(/^\w+:\/\//.test(raw)||raw.includes('\\')||/%2f|%5c|%00/i.test(raw))return '/[invalid]';
  let p=new URL(raw,'https://invalid.local').pathname;
  p=p.replace(/\/{2,}/g,'/');
  if(!/^\/[a-zA-Z0-9/_\.~-]*$/.test(p)||p.includes('..'))return '/[invalid]';
  if(p!=='/' && !/\.[a-z0-9]+$/i.test(p))p=p.replace(/\/$/,'')+'/';
  return p.slice(0,255);
 }catch{return '/[invalid]';}
}
const excluded=/\.(?:css|js|map|png|jpe?g|webp|svg|gif|ico|woff2?|ttf|mp4|pdf|zip)$/i;
export function classifyPath(raw,knowledge){
 const p=safePath(raw);
 const base={path:p,page_type:'unmapped_resource',semantic_intent:null,product_id:null,category_id:null,resource_type:null,commercial_status:null};
 if(p==='/[invalid]'||p.startsWith('/api/')||p.startsWith('/admin/')||p.startsWith('/assets/')||p==='/healthz'||excluded.test(p))return {...base,eligible:false};
 if(p==='/'||p==='/index.html')return {...base,page_type:'brand_home',semantic_intent:'intent:marca',resource_type:'html',eligible:true};
 if(p==='/robots.txt')return {...base,page_type:'system_robots',resource_type:'robots',eligible:true};
 if(p==='/sitemap.xml')return {...base,page_type:'system_sitemap',resource_type:'sitemap',eligible:true}; // may be HTTP 404 in prelaunch
 if(p==='/llms.txt'||p==='/llms-full.txt')return {...base,page_type:'system_llms',resource_type:'llms',eligible:knowledge.manifest.files.includes(p.slice(1))};
 if(p.startsWith('/ai/')){
  const inManifest=p==='/ai/content-manifest.json'||knowledge.manifest.files.includes(p.slice(1));
  return {...base,page_type:inManifest?'semantic_resource':'unmapped_resource',resource_type:inManifest?'ai_asset':null,eligible:inManifest};
 }
 const productId=p.match(/^\/productos\/([a-z0-9-]+)\/(?:index\.html)?$/)?.[1];
 if(productId){
  const product=knowledge.products.find(x=>x.id===productId);
  if(!product || product.contentStatus==='conceptual')return {...base,eligible:false};
  const matches=knowledge.intents.filter(x=>x.productIds?.includes(productId)&&x.productIds.length===1);
  return {...base,page_type:'product_detail',product_id:product.id,category_id:product.categoryId,
   semantic_intent:matches[0]?.id||null,commercial_status:product.commercialStatus,resource_type:'html',eligible:true};
 }
 if(p==='/guia/estuche-o-humidor/'||p==='/guia/estuche-o-humidor/index.html')
  return {...base,page_type:'product_collection',semantic_intent:'intent:comparar-estuche-humidor',resource_type:'html',eligible:true};
 return {...base,eligible:false};
}

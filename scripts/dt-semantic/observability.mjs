import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline';
import fs from 'node:fs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const productIds=new Set(JSON.parse(fs.readFileSync(path.join(root,'knowledge/products.json'))).map(p=>p.id));
const searchHosts={google:'google',bing:'bing',duckduckgo:'duckduckgo',yahoo:'yahoo'};
const sanitizePath=input=>{
  try{const str=String(input||'/');const url=new URL(str,'https://sanitized.invalid');return url.pathname.replace(/[^\w/-]/g,'').slice(0,180)||'/';}
  catch{return '/';}
};
const event=(eventType,data={})=>({eventType,occurredAt:data.occurredAt??null,path:data.path||'/',verification:data.verification||'not_applicable',source:data.source||'hosting_log',httpStatus:data.httpStatus??null,actorFamily:data.actorFamily||'unknown',evidence:data.evidence||'not_applicable',searchEngine:data.searchEngine??null,productId:data.productId??null,interaction:data.interaction??null});
export function normalizeLogRow(row){
  if(!row||typeof row!=='object'||Array.isArray(row))return [];
  const pathValue=sanitizePath(row.path??row.ClientRequestURI??row.uri??row.request_path);
  const status=Number(row.status??row.EdgeResponseStatus??row.status_code);
  const httpStatus=Number.isInteger(status)&&status>=100&&status<=599?status:null;
  const ua=String(row.userAgent??row.ClientRequestUserAgent??row.ua??'');
  const isBot=/bot|crawler|spider|slurp|fetcher|chatgpt-user/i.test(ua);
  const actorFamily=/GPTBot|ChatGPT|ClaudeBot|PerplexityBot|Bytespider/i.test(ua)?'ai_bot':/Googlebot|Bingbot|DuckDuckBot|Applebot/i.test(ua)?'search_bot':isBot?'generic_bot':'browser';
  const occurredAt=typeof(row.timestamp??row.datetime??row.EdgeStartTimestamp)==='string'?(row.timestamp??row.datetime??row.EdgeStartTimestamp):null;
  const source=row.source==='cdn_log'?'cdn_log':'hosting_log';
  const common={path:pathValue,httpStatus,occurredAt,actorFamily,source,verification:isBot?'unverified':'not_applicable',evidence:isBot?'none':'not_applicable'};
  const events=[];
  if(isBot){events.push(event('crawler_request',common));events.push(event('crawler_unverified',common));}
  // UA alone is never proof. This adapter does not emit crawler_verified.
  if(/^\/(ai\/|llms(?:-full)?\.txt)/.test(pathValue))events.push(event('semantic_asset_request',common));
  const match=pathValue.match(/^\/productos\/([a-z0-9-]+)\/?/);
  if(match&&productIds.has(match[1]))events.push(event('product_page_request',{...common,productId:match[1]}));
  if(isBot&&httpStatus>=400)events.push(event('crawler_http_error',common));
  const referer=String(row.referer??row.Referer??row.referer_url??'');
  try{
    const host=new URL(referer).hostname.toLowerCase();
    const engine=Object.keys(searchHosts).find(key=>host===key+'.com'||host.endsWith('.'+key+'.com'));
    if(engine)events.push(event('search_referral',{...common,searchEngine:searchHosts[engine],verification:'not_applicable',evidence:'not_applicable'}));
  }catch{}
  if(row.eventType==='product_interaction'&&productIds.has(row.productId)){
    const interaction=String(row.interaction||'');
    if(['view_details','gallery_next','gallery_prev','select'].includes(interaction))
      events.push(event('product_interaction',{...common,source:'site_integration',productId:row.productId,interaction,verification:'not_applicable',evidence:'not_applicable'}));
  }
  return events;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const stream=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
  for await(const line of stream){if(!line.trim())continue;try{for(const ev of normalizeLogRow(JSON.parse(line)))process.stdout.write(JSON.stringify(ev)+'\n');}catch(e){process.stderr.write('Invalid JSON log line skipped\n');}}
}

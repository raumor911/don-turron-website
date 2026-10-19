import {SITE_ID} from './config.mjs';
import {crawlerInsert,visitorUpsert,sessionUpsert,webEventInsert} from './schema.mjs';
import {detectCrawler} from './crawler.mjs';
import {classifyPath,safePath} from './semantic.mjs';
import {createHash} from 'node:crypto';
const utc=d=>{const v=new Date(d);return Number.isNaN(v.getTime())?null:v.toISOString().slice(0,19).replace('T',' ');};
const short=(x,max)=>typeof x==='string'?x.slice(0,max):null;
const allowedEvents=new Set(['page_view','section_view','product_view','gallery_navigation','image_zoom','category_filter','selection_add','selection_remove','selection_open','selection_copy','contact_click']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const namespace=id=>{const s=createHash('sha256').update(SITE_ID+':'+id).digest('hex');return s.slice(0,8)+'-'+s.slice(8,12)+'-4'+s.slice(13,16)+'-a'+s.slice(17,20)+'-'+s.slice(20,32);};
export function humanPayload(body,knowledge){
 if(!body||typeof body!=='object'||Array.isArray(body)||!allowedEvents.has(body.event)||!uuid.test(body.visitor_id||'')||!uuid.test(body.session_id||''))return null;
 if(body.site_id && body.site_id!==SITE_ID)return null;
 const path=safePath(body.path||'/');
 const classified=classifyPath(path,knowledge);
 if(!classified.eligible)return null;
 if(body.properties&&(!Array.isArray(body.properties)&&typeof body.properties!=='object'))return null;
 const raw=body.properties||{};
 if(Array.isArray(raw))return null;
 const safe={telemetry_version:'DT-TEL-V1',site_id:SITE_ID,page_type:classified.page_type,semantic_intent:classified.semantic_intent,source:'browser'};
 const p=raw.product_id;
 if(p!==undefined){
  if(typeof p!=='string'||!knowledge.products.some(item=>item.id===p))return null;
  const item=knowledge.products.find(x=>x.id===p);
  safe.product_id=item.id;safe.category_id=item.categoryId;safe.commercial_status=item.commercialStatus;
 }
 if(typeof raw.section==='string'&&/^[a-z0-9_-]{1,48}$/i.test(raw.section))safe.section=raw.section;
 if(typeof raw.filter==='string'&&/^(todos|soportes|encendedores|humidores|ceniceros|estuches)$/.test(raw.filter))safe.filter=raw.filter;
 if(Number.isInteger(raw.image_index)&&raw.image_index>=0&&raw.image_index<=12)safe.image_index=raw.image_index;
 if(typeof raw.zoomed==='boolean')safe.zoomed=raw.zoomed;
 if(['product_view','gallery_navigation','image_zoom','selection_add','selection_remove'].includes(body.event)&&!safe.product_id)return null;
 if(body.event==='category_filter'&&!safe.filter)return null;
 const now=utc(Date.now());
 return {event:body.event,visitor:namespace(body.visitor_id),session:namespace(body.session_id),path,device:['desktop','tablet','mobile'].includes(body.device_type)?body.device_type:'desktop',properties:safe,now};
}
export function crawlerRow(row,knowledge){
 if(!row||typeof row!=='object'||Array.isArray(row))return null;
 const method=String(row.method??row.request_method??row.RequestMethod??'').toUpperCase();
 if(!['GET','HEAD'].includes(method))return null;
 const path=classifyPath(row.path??row.request_path??row.ClientRequestURI??'',knowledge);
 if(!path.eligible)return null;
 const ua=short(row.user_agent??row.userAgent??row.ClientRequestUserAgent,250)||'';
 const bot=detectCrawler(ua);if(!bot)return null;
 const code=Number(row.status??row.status_code??row.EdgeResponseStatus);
 if(!Number.isInteger(code)||code<100||code>599)return null;
 const when=utc(row.timestamp??row.requested_at??row.datetime);
 if(!when)return null;
 const duration=Number(row.duration_ms??row.response_time_ms);
 const elapsed=Number.isFinite(duration)&&duration>=0&&duration<=300000?Math.round(duration):null;
 const properties={telemetry_version:'DT-TEL-V1',site_id:SITE_ID,page_type:path.page_type,semantic_intent:path.semantic_intent,
  product_id:path.product_id,category_id:path.category_id,resource_type:path.resource_type,crawler_purpose:bot.crawler_purpose,
  detection_method:bot.detection_method,verification_status:'claimed',source:row.source==='cdn_log'?'cdn_log':'hosting_log',test_run:row.test_run===true};
 return {method,path:path.path,ua,code,when,elapsed,properties,bot};
}
export function createPipeline(db,knowledge,{max=30}={}){
 const queue=[];let active=false;const state=db.state;
 async function pump(){
  if(active)return;active=true;
  while(queue.length){
   const task=queue.shift();state.queue_depth=queue.length;
   try{await task();state.events_persisted++;state.last_success_at=new Date().toISOString();}
   catch{state.events_failed++;state.last_error_at=new Date().toISOString();}
  }
  active=false;
 }
 function push(task){
  state.events_captured++;
  if(!db.config.enabled||!db.config.writeApproved||!db.config.dbConfigured||queue.length>=max){state.events_dropped++;return false;}
  queue.push(task);state.queue_depth=queue.length;void pump();return true;
 }
 function crawler(row){
  const parsed=crawlerRow(row,knowledge);
  if(!parsed)return false;
  const p=parsed;
  return push(async()=>db.execute(crawlerInsert,[SITE_ID,p.bot.crawler_name,p.bot.crawler_family,p.ua,p.path,p.method,p.code,null,p.when,p.elapsed,null,JSON.stringify(p.properties)]));
 }
 function human(body){
  const h=humanPayload(body,knowledge);if(!h)return false;
  return push(()=>db.transact([
   [visitorUpsert,[SITE_ID,h.visitor,h.now,h.now]],
   [sessionUpsert,[SITE_ID,h.session,h.visitor,h.now,h.now,h.path,h.path,null,null,null,null,h.device]],
   [webEventInsert,[SITE_ID,h.visitor,h.session,h.event,h.now,JSON.stringify(h.properties)]]
  ]));
 }
 async function flush(){while(active||queue.length)await new Promise(done=>setTimeout(done,5));}
 return {crawler,human,flush,status:()=>({...state,queue_depth:queue.length})};
}

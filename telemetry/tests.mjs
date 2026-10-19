import test from 'node:test';
import assert from 'node:assert/strict';
import {settings,SITE_ID} from './config.mjs';
import {detectCrawler} from './crawler.mjs';
import {safePath,classifyPath,loadSemantic} from './semantic.mjs';
import {REQUIRED,validateSchema,crawlerInsert,inspectSchema} from './schema.mjs';
import {crawlerRow,humanPayload,createPipeline} from './pipeline.mjs';
import {TelemetryDatabase} from './db.mjs';
const knowledge=loadSemantic();
const v4='123e4567-e89b-42d3-a456-426614174000';
const validMeta=()=>{
 const meta={};
 for(const [table,fields]of Object.entries(REQUIRED)){
  const cols=Object.entries(fields).map(([Field,type])=>({Field,Type:type==='integer'?'int(11)':type==='date'?'datetime':type==='json'?'json':'varchar(255)',Null:Field==='ip_hash'||['referer','referrer','utm_source','utm_medium','utm_campaign','properties'].includes(Field)?'YES':'NO',Default:null,Extra:''}));
  const indices=[{Key_name:'by_site',Non_unique:1,Column_name:'site_id',Seq_in_index:1}];
  if(table==='visitors'||table==='sessions'){
   const id=table==='visitors'?'visitor_id':'session_id';
   indices.push({Key_name:'scope',Non_unique:0,Column_name:'site_id',Seq_in_index:1},{Key_name:'scope',Non_unique:0,Column_name:id,Seq_in_index:2});
  }
  meta[table]={columns:cols,indexes:indices};
 }
 return meta;
};
test('DT-TEL-001 known bots, claimed not verified, extended policy',()=>{
 for(const [ua,name] of [['Googlebot/2.1','Googlebot'],['OAI-SearchBot/1.0','OAI-SearchBot'],['GPTBot/1.0','GPTBot'],['bingbot/2.0','bingbot'],['Claude-SearchBot/1.0','Claude-SearchBot'],['Claude-User/1.0','Claude-User'],['ClaudeBot/1.0','ClaudeBot'],['ChatGPT-User/1.0','ChatGPT-User'],['PerplexityBot','PerplexityBot'],['Applebot/1.0','Applebot'],['Meta-ExternalAgent/1','Meta-ExternalAgent'],['x-crawler/2','generic-crawler']]){
  const d=detectCrawler(ua);assert.equal(d?.crawler_name,name,ua);assert.equal(d?.verification_status,'claimed');
 }
 assert.equal(detectCrawler('Mozilla/5.0'),null);
 assert.equal(detectCrawler('Google-Extended'),null);
 assert.equal(detectCrawler('NotGooglebot')?.crawler_name,'generic-crawler'); // not misidentified as Googlebot
});
test('Semantic Core manifest drives resources and product IDs',()=>{
 assert.equal(knowledge.products.length,6);
 assert.equal(classifyPath('/productos/humidor-viaje-5-puros/?token=secret',knowledge).product_id,'humidor-viaje-5-puros');
 assert.equal(classifyPath('/productos/encendedor-jet/',knowledge).eligible,false);
 assert.equal(classifyPath('/llms.txt',knowledge).page_type,'system_llms');
 assert.equal(classifyPath('/ai/knowledge-graph.json',knowledge).page_type,'semantic_resource');
 assert.equal(classifyPath('/ai/brand.md',knowledge).eligible,true);
 assert.equal(classifyPath('/sitemap.xml',knowledge).page_type,'system_sitemap');
 assert.equal(classifyPath('/api/telemetry',knowledge).eligible,false);
 assert.equal(classifyPath('/assets/products/photo.webp',knowledge).eligible,false);
 assert.equal(safePath('/productos/humidor-viaje-5-puros/?password=x'),'/productos/humidor-viaje-5-puros/');
 assert.equal(safePath('https://example.org/?secret=x'),'/[invalid]');
});
test('GET/HEAD, real 404 and 500, no duplicate suppression and redaction',()=>{
 for(const method of ['GET','HEAD'])for(const status of [200,404,500]){
  const row=crawlerRow({method,path:'/llms.txt?key=private',status,user_agent:'GPTBot/1',timestamp:'2026-10-18T11:00:00Z',duration_ms:23,ip:'192.0.2.5'},knowledge);
  assert.equal(row.method,method);assert.equal(row.code,status);assert.equal(row.path,'/llms.txt');
  assert.equal(row.properties.verification_status,'claimed');assert.equal(row.properties.source,'hosting_log');
  assert.equal(JSON.stringify(row).includes('private'),false);assert.equal(JSON.stringify(row).includes('192.0.2.5'),false);
 }
 assert.equal(crawlerRow({method:'POST',path:'/',status:200,user_agent:'Googlebot',timestamp:new Date().toISOString()},knowledge),null);
 assert.equal(crawlerRow({method:'GET',path:'/styles.css',status:200,user_agent:'Googlebot',timestamp:new Date().toISOString()},knowledge),null);
 assert.equal(crawlerRow({method:'GET',path:'/',status:200,user_agent:'Mozilla',timestamp:new Date().toISOString()},knowledge),null);
});
test('Schema detects unsafe cross-site indexes, additional non-null columns and types',()=>{
 const meta=validMeta();assert.deepEqual(validateSchema(meta).errors,[]);
 meta.sessions.indexes.push({Key_name:'session_global',Non_unique:0,Column_name:'session_id',Seq_in_index:1});
 assert.ok(validateSchema(meta).errors.includes('sessions:cross_site_unique_risk'));
 meta.sessions.indexes.pop();
 meta.web_events.columns.push({Field:'mandatory_secret',Type:'varchar(50)',Null:'NO',Default:null,Extra:''});
 assert.ok(validateSchema(meta).errors.includes('web_events:extra_mandatory:mandatory_secret'));
 meta.web_events.columns.pop();
 meta.ai_crawler_visits.columns.find(x=>x.Field==='ip_hash').Null='NO';
 assert.ok(validateSchema(meta).errors.includes('ai_crawler_visits:ip_hash_requires_nullable'));
});
test('Site ID immutable; disabled and DB absent fail closed',()=>{
 assert.equal(SITE_ID,'don-turron');
 assert.throws(()=>settings({TELEMETRY_SITE_ID:'allison-garcia'}),/site_id_mismatch/);
 const cfg=settings({TELEMETRY_ENABLED:'false'});
 const db=new TelemetryDatabase(cfg);assert.equal(db.writable,false);
 assert.equal(db.state.schema_verified,false);
 assert.equal(humanPayload({event:'product_view',visitor_id:v4,session_id:v4,path:'/',site_id:'erika-morales'},knowledge),null);
});
test('Human event whitelist, scope and forbidden payload fields',()=>{
 const h=humanPayload({event:'product_view',visitor_id:v4,session_id:v4,path:'/?email=hidden',properties:{product_id:'reposa-puros-plegable',email:'private',token:'secret',name:'someone',quantity:3}},knowledge);
 assert.equal(h.properties.product_id,'reposa-puros-plegable');
 assert.notEqual(h.visitor,v4);
 assert.equal(h.properties.site_id,SITE_ID);
 assert.equal(JSON.stringify(h).includes('private'),false);
 assert.equal(JSON.stringify(h).includes('hidden'),false);
 assert.equal(humanPayload({event:'purchase',visitor_id:v4,session_id:v4,path:'/'},knowledge),null);
 assert.equal(humanPayload({event:'gallery_navigation',visitor_id:v4,session_id:v4,path:'/'},knowledge),null);
});
test('Simulated inserts for bot and human use fixed site, null ip; real persistence NOT claimed',async()=>{
 const sql=[];const fake={config:{enabled:true,writeApproved:true,dbConfigured:true},state:{events_captured:0,events_persisted:0,events_failed:0,events_dropped:0,queue_depth:0,last_success_at:null,last_error_at:null},execute:async(s,p)=>{sql.push([s,p])},transact:async(ops)=>{sql.push(...ops)}};
 const p=createPipeline(fake,knowledge);
 const row={method:'HEAD',path:'/productos/humidor-viaje-5-puros/',status:500,user_agent:'OAI-SearchBot',timestamp:'2026-10-18T10:00:00Z'};
 assert.equal(p.crawler(row),true);assert.equal(p.crawler(row),true);
 assert.equal(p.human({event:'product_view',visitor_id:v4,session_id:v4,path:'/',properties:{product_id:'cenicero-mesa'}}),true);
 await p.flush();assert.equal(sql.length,5);
 assert.equal(sql[0][0],crawlerInsert);assert.equal(sql[0][1][0],SITE_ID);assert.equal(sql[0][1][10],null);
 for(const [,params]of sql)assert.equal(params[0],SITE_ID);
 assert.equal(p.status().events_persisted,3);
});
test('Backoff and unavailable MySQL never cause site failure',async()=>{
 const cfg={...settings({TELEMETRY_ENABLED:'true',TELEMETRY_WRITE_APPROVED:'true',DB_HOST:'db.internal',DB_USER:'test',DB_PASSWORD:'unused',DB_NAME:'u345974778_rauviaplatform'}),enabled:true};
 const fakePool={query:async()=>{throw new Error('simulated db failure')}};
 const db=new TelemetryDatabase(cfg,{pool:fakePool});
 assert.equal(await db.connect(),false);assert.equal(db.state.schema_verified,false);
 const p=createPipeline(db,knowledge);
 p.crawler({method:'GET',path:'/',status:404,user_agent:'GPTBot',timestamp:'2026-10-18T10:00:00Z'});
 await p.flush();assert.equal(p.status().events_persisted,0);
 assert.ok(p.status().events_failed>0);
});
test('Bounded queue drops when saturated, no unbounded memory',async()=>{
 let resolve;
 const gate=new Promise(r=>resolve=r);
 const fake={config:{enabled:true,writeApproved:true,dbConfigured:true},state:{events_captured:0,events_persisted:0,events_failed:0,events_dropped:0,queue_depth:0,last_success_at:null,last_error_at:null},execute:async()=>{await gate}};
 const p=createPipeline(fake,knowledge,{max:1});
 const row={method:'GET',path:'/',status:200,user_agent:'Googlebot',timestamp:'2026-10-18T10:00:00Z'};
 assert.equal(p.crawler(row),true);assert.equal(p.crawler(row),true);assert.equal(p.crawler(row),false);
 assert.equal(p.status().events_dropped,1);resolve();await p.flush();
});

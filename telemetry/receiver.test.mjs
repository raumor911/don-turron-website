import test from 'node:test';
import assert from 'node:assert/strict';
import {createReceiver} from './receiver.mjs';
import {normalizeHostLog,importLines} from './import-logs.mjs';
import {loadSemantic} from './semantic.mjs';
const knowledge=loadSemantic();
const uuid='123e4567-e89b-42d3-a456-426614174000';
function stub(){
 const state={schema_verified:true,db_connected:true,events_captured:0,events_persisted:0,events_failed:0,events_dropped:0,queue_depth:0,last_success_at:null,last_error_at:null};
 const writes=[];
 return {config:{enabled:true,writeApproved:true,dbConfigured:true},state,writes,connect:async()=>true,
  transact:async commands=>{writes.push(...commands)},execute:async(sql,params)=>{writes.push([sql,params])}};
}
test('DT-TEL-002 log adapter retains observed status, method and excludes sensitive fields',()=>{
 const d=normalizeHostLog({ClientRequestMethod:'HEAD',ClientRequestURI:'/ai/knowledge-graph.json?token=x',EdgeResponseStatus:500,ClientRequestUserAgent:'GPTBot/1',timestamp:'2026-10-18T10:00:00Z',source:'cdn_log',CFConnectingIP:'203.0.113.2'});
 assert.equal(d.method,'HEAD');assert.equal(d.status,500);
 const db=stub();const pipeline={crawler:x=>{assert.equal(x.source,'cdn_log');assert.equal(x.path,d.path);return true;},flush:async()=>{}};
 return importLines([JSON.stringify(d),'not-json'],pipeline,db).then(v=>{assert.equal(v.parsed,2);assert.equal(v.accepted,1);assert.equal(v.rejected,1)});
});
test('DT-TEL-002 secure optional HTTP receiver; site scope, validation and disabled privacy',async()=>{
 const db=stub(),config={enabled:true,writeApproved:true,dbConfigured:true,host:'dt.test'};
 const srv=createReceiver({db,config,knowledge});
 await new Promise(resolve=>srv.server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+srv.server.address().port;
 try{
  const cfg=await fetch(base+'/api/telemetry/config');
  const parsed=await cfg.json();assert.equal(parsed.site_id,'don-turron');assert.equal(parsed.enabled,true);
  const payload={event:'product_view',path:'/',visitor_id:uuid,session_id:uuid,properties:{product_id:'cenicero-mesa',phone:'never_save'}};
  const post=(body,origin='https://dt.test')=>fetch(base+'/api/telemetry',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
  assert.equal((await post(payload,'https://other.test')).status,403);
  assert.equal((await post({...payload,site_id:'allison-garcia'})).status,400);
  assert.equal((await post(payload)).status,204);
  await srv.pipeline.flush();assert.equal(db.writes.length,3);
  assert.ok(db.writes.every(([,values])=>values[0]==='don-turron'));
  assert.equal(JSON.stringify(db.writes).includes('never_save'),false);
  assert.equal((await fetch(base+'/healthz')).status,200);
  assert.equal((await fetch(base+'/api/other')).status,404);
 }finally{await new Promise(resolve=>srv.server.close(resolve));}
});

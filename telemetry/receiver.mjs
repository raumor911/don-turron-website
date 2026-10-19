import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {settings,SITE_ID} from './config.mjs';
import {TelemetryDatabase} from './db.mjs';
import {createPipeline} from './pipeline.mjs';
import {loadSemantic} from './semantic.mjs';

function send(res,code,data=null){
 res.writeHead(code,{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':data?'application/json':'text/plain'});
 res.end(data?JSON.stringify(data):'');
}
export function createReceiver({config=settings(),db=new TelemetryDatabase(config),knowledge=loadSemantic()}={}){
 const pipeline=createPipeline(db,knowledge);
 const limiter=new Map();
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url||'/', 'http://localhost');
   const route=url.pathname;
   if(req.method==='GET'&&route==='/api/telemetry/config'){
    const ready=config.enabled&&config.writeApproved&&config.dbConfigured&&Boolean(config.host)&&await db.connect();
    return send(res,200,{enabled:Boolean(ready),site_id:SITE_ID});
   }
   if(req.method==='GET'&&route==='/healthz')return send(res,200,{telemetry_enabled:config.enabled,db_configured:config.dbConfigured,schema_verified:db.state.schema_verified,db_connected:db.state.db_connected,events_captured:db.state.events_captured,events_persisted:db.state.events_persisted,events_failed:db.state.events_failed,events_dropped:db.state.events_dropped,queue_depth:db.state.queue_depth,last_success_at:db.state.last_success_at,last_error_at:db.state.last_error_at});
   if(req.method!=='POST'||route!=='/api/telemetry')return send(res,404);
   if(!config.enabled||!config.writeApproved||!config.host)return send(res,204);
   const origin=req.headers.origin;
   // no origin permits native calls only from same-site proxy with trusted configured Host.
   const allowed='https://'+config.host;
   if(origin!==allowed||req.headers['sec-fetch-site']==='cross-site')return send(res,403);
   if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return send(res,415);
   if(Number(req.headers['content-length']||0)>4096)return send(res,413);
   // Socket address used transiently for rate limiting; never persisted to MySQL/logs.
   const key=createHash('sha256').update(req.socket.remoteAddress||'unknown').digest('hex');
   const now=Date.now();
   for(const [k,v] of limiter)if(v.until<now)limiter.delete(k);
   if(!limiter.has(key)){if(limiter.size>=1000)return send(res,429);limiter.set(key,{count:0,until:now+60000});}
   if(++limiter.get(key).count>60)return send(res,429);
   let bytes=0,buf='';
   for await(const chunk of req){
    bytes+=chunk.length;
    if(bytes>4096)return send(res,413);
    buf+=chunk.toString('utf8');
   }
   let body;try{body=JSON.parse(buf)}catch{return send(res,400);}
   // Client-provided site_id is never used to assign a write target.
   if(!await db.connect())return send(res,204);
   if(!pipeline.human(body))return send(res,400);
   return send(res,204); // accepted, NOT necessarily persisted
  }catch{return send(res,204);} // Fail open for site UX, fail closed for telemetry.
 });
 return {server,db,pipeline};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const service=createReceiver();
 const port=Number(process.env.TELEMETRY_PORT||4385);
 service.server.listen(port,'127.0.0.1',()=>process.stdout.write('Don Turrón telemetry receiver listening on loopback\n'));
 const close=()=>service.server.close(async()=>{await service.pipeline.flush();await service.db.close();process.exit(0);});
 process.on('SIGTERM',close);process.on('SIGINT',close);
}

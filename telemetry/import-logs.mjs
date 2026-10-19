import readline from 'node:readline';
import {stdin} from 'node:process';
import {settings} from './config.mjs';
import {TelemetryDatabase} from './db.mjs';
import {createPipeline} from './pipeline.mjs';
import {loadSemantic} from './semantic.mjs';

export function normalizeHostLog(row){
 // Explicitly supported NDJSON exports; adapt provider-specific CSV/access logs before importing.
 if(!row||typeof row!=='object'||Array.isArray(row))return null;
 const method=row.method??row.request_method??row.ClientRequestMethod;
 const uri=row.path??row.request_path??row.ClientRequestURI;
 const status=row.status??row.status_code??row.EdgeResponseStatus;
 const ua=row.user_agent??row.userAgent??row.ClientRequestUserAgent;
 const timestamp=row.timestamp??row.requested_at??row.datetime;
 const duration_ms=row.duration_ms??row.response_time_ms;
 return {method,path:uri,status,user_agent:ua,timestamp,duration_ms,source:row.source==='cdn_log'?'cdn_log':'hosting_log'};
}
export async function importLines(lines,pipeline,db,{testRun=false}={}){
 let parsed=0,rejected=0,accepted=0;
 for await(const line of lines){
  if(!line.trim())continue;
  parsed++;
  let row;try{row=normalizeHostLog(JSON.parse(line));}catch{rejected++;continue;}
  if(!row){rejected++;continue;}
  row.test_run=testRun===true; // Trusted CLI option only, never a field from HTTP logs.
  if(pipeline.crawler(row))accepted++;
  if(parsed%20===0)await pipeline.flush(); // bounded upstream backpressure
 }
 await pipeline.flush();
 return {parsed,rejected,accepted,persisted:db.state.events_persisted,failed:db.state.events_failed,dropped:db.state.events_dropped};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const cfg=settings();const db=new TelemetryDatabase(cfg);const pipeline=createPipeline(db,loadSemantic());
 const input=readline.createInterface({input:stdin,crlfDelay:Infinity});
 const result=await importLines(input,pipeline,db,{testRun:process.argv.includes('--test-run')});
 await db.close();
 process.stdout.write(JSON.stringify(result)+'\n');
 if(!cfg.enabled||!cfg.writeApproved||!cfg.dbConfigured)process.stderr.write('Telemetry disabled/unconfigured: no database writes performed.\n');
}

export const REQUIRED={
 ai_crawler_visits:{site_id:'string',crawler_name:'string',crawler_family:'string',user_agent:'string',request_path:'string',request_method:'string',status_code:'integer',referer:'string',requested_at:'date',response_time_ms:'integer',ip_hash:'string',properties:'json'},
 visitors:{site_id:'string',visitor_id:'string',first_seen_at:'date',last_seen_at:'date'},
 sessions:{site_id:'string',session_id:'string',visitor_id:'string',started_at:'date',last_activity_at:'date',landing_page:'string',exit_page:'string',referrer:'string',utm_source:'string',utm_medium:'string',utm_campaign:'string',device_type:'string'},
 web_events:{site_id:'string',visitor_id:'string',session_id:'string',event_name:'string',event_timestamp:'date',properties:'json'}
};
const typeOk=(sql,expected)=>expected==='integer'?/^(tinyint|smallint|mediumint|int|integer|bigint)/.test(sql):expected==='date'?/^(timestamp|datetime)/.test(sql):expected==='json'?/^(json|text|mediumtext|longtext|varchar)/.test(sql):/^(varchar|char|text|tinytext|mediumtext|longtext)/.test(sql);
export function validateSchema(metadata){
 const errors=[];
 for(const [table,required] of Object.entries(REQUIRED)){
  const meta=metadata[table];
  if(!meta || !Array.isArray(meta.columns)||!Array.isArray(meta.indexes)){errors.push(table+':not_inspected');continue;}
  const fields=new Map(meta.columns.map(c=>[c.Field,c]));
  for(const [field,t] of Object.entries(required)){
   const col=fields.get(field);
   if(!col){errors.push(table+':missing:'+field);continue;}
   if(!typeOk(String(col.Type||'').toLowerCase(),t))errors.push(table+':incompatible_type:'+field);
  }
  // These columns are intentionally written as NULL when unavailable.
  const nullable={ai_crawler_visits:['referer','ip_hash','response_time_ms'],sessions:['referrer','utm_source','utm_medium','utm_campaign']};
  for(const name of nullable[table]||[])if(fields.has(name)&&fields.get(name).Null!=='YES')errors.push(table+':nullable_required:'+name);
  const minimum={site_id:10,visitor_id:36,session_id:36,request_path:255};
  for(const [name,length]of Object.entries(minimum)){
   const col=fields.get(name);
   const m=col&&String(col.Type).match(/^(?:var)?char\((\d+)\)/i);
   if(m&&Number(m[1])<length)errors.push(table+':too_short:'+name);
  }
  const site=fields.get('site_id');
  if(site && site.Null==='YES') errors.push(table+':nullable_site_id');
  if(table==='ai_crawler_visits'&&fields.get('ip_hash')?.Null!=='YES')errors.push(table+':ip_hash_requires_nullable');
  for(const col of meta.columns){
   if(!(col.Field in required)&&col.Null==='NO'&&col.Default==null&&!/auto_increment|generated/i.test(col.Extra||''))errors.push(table+':extra_mandatory:'+col.Field);
  }
  const groups=new Map();
  for(const idx of meta.indexes){
   const g=groups.get(idx.Key_name)||{unique:Number(idx.Non_unique)===0,columns:[]};
   g.columns.push({seq:Number(idx.Seq_in_index||g.columns.length+1),name:idx.Column_name});groups.set(idx.Key_name,g);
  }
  const indexes=[...groups.values()].map(x=>({...x,columns:x.columns.sort((a,b)=>a.seq-b.seq).map(e=>e.name)}));
  if(!indexes.some(i=>i.columns[0]==='site_id'))errors.push(table+':site_id_leading_index_required');
  if(['visitors','sessions'].includes(table)){
   const id=table==='visitors'?'visitor_id':'session_id';
   if(!indexes.some(i=>i.unique&&i.columns.length===2&&i.columns[0]==='site_id'&&i.columns[1]===id))errors.push(table+':composite_site_unique_required');
   if(indexes.some(i=>i.unique&&i.columns.includes(id)&&!i.columns.includes('site_id')))errors.push(table+':cross_site_unique_risk');
  }
 }
 return {schema_verified:errors.length===0,errors};
}
export async function inspectSchema(pool){
 const meta={};
 for(const table of Object.keys(REQUIRED)){
  // table names come exclusively from constant, never user input
  const [columns]=await pool.query('SHOW COLUMNS FROM `'+table+'`');
  const [indexes]=await pool.query('SHOW INDEX FROM `'+table+'`');
  meta[table]={columns,indexes};
 }
 return validateSchema(meta);
}
export const crawlerInsert=`INSERT INTO ai_crawler_visits (
 site_id,crawler_name,crawler_family,user_agent,request_path,request_method,status_code,referer,requested_at,response_time_ms,ip_hash,properties
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`;
export const visitorUpsert=`INSERT INTO visitors (site_id,visitor_id,first_seen_at,last_seen_at)
VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE last_seen_at=VALUES(last_seen_at)`;
export const sessionUpsert=`INSERT INTO sessions (site_id,session_id,visitor_id,started_at,last_activity_at,landing_page,exit_page,referrer,utm_source,utm_medium,utm_campaign,device_type)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE last_activity_at=VALUES(last_activity_at),exit_page=VALUES(exit_page)`;
export const webEventInsert=`INSERT INTO web_events (site_id,visitor_id,session_id,event_name,event_timestamp,properties)
VALUES (?,?,?,?,?,?)`;

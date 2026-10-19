import {inspectSchema} from './schema.mjs';
export class TelemetryDatabase{
 constructor(config,options={}){
  this.config=config;this.pool=options.pool||null;this.factory=options.factory||null;
  this.state={telemetry_enabled:config.enabled,db_configured:config.dbConfigured,schema_verified:false,db_connected:false,permissions_verified:false,
  events_captured:0,events_persisted:0,events_failed:0,events_dropped:0,queue_depth:0,last_success_at:null,last_error_at:null};
  this.nextRetry=0;this.checking=null;
 }
 get writable(){return this.config.enabled&&this.config.writeApproved&&this.config.dbConfigured&&this.state.schema_verified&&this.state.permissions_verified;}
 failure(){this.state.db_connected=false;this.state.last_error_at=new Date().toISOString();this.nextRetry=Date.now()+this.config.backoffMs;}
 async connect(){
  if(!this.config.enabled||!this.config.writeApproved||!this.config.dbConfigured||Date.now()<this.nextRetry)return false;
  if(this.checking)return this.checking;
  if(this.writable)return true;
  this.checking=(async()=>{
   try{
    if(!this.pool){
     const createPool=this.factory||(await import('mysql2/promise')).default.createPool;
     this.pool=createPool({host:this.config.dbHost,port:this.config.dbPort,user:this.config.dbUser,password:this.config.dbPassword,
      database:this.config.dbName,connectionLimit:3,maxIdle:3,waitForConnections:true,queueLimit:3,connectTimeout:3000,
      dateStrings:true,timezone:'Z'});
    }
    const check=await inspectSchema(this.pool);
    this.state.schema_verified=check.schema_verified;
    if(!check.schema_verified){this.lastDiagnostics=check.errors;throw new Error('schema_incompatible');}
    // SHOW GRANTS is read-only; explicit write permission is NOT assumed from schema alone.
    const [grants]=await this.pool.query('SHOW GRANTS FOR CURRENT_USER()');
    const statements=JSON.stringify(grants).toUpperCase();
    const canInsert=/INSERT|ALL PRIVILEGES/.test(statements);
    const canSelect=/SELECT|ALL PRIVILEGES/.test(statements);
    this.state.permissions_verified=canInsert&&canSelect;
    if(!this.state.permissions_verified)throw new Error('permissions_unconfirmed');
    this.state.db_connected=true;return true;
   }catch{this.failure();this.state.schema_verified=false;this.state.permissions_verified=false;return false;}
   finally{this.checking=null;}
  })();
  return this.checking;
 }
 async execute(sql,values){
  if(!await this.connect())throw new Error('db_not_verified');
  // Driver statement timeout; capped pool queue. Never log raw SQL values or secrets.
  return this.pool.execute({sql,timeout:this.config.timeoutMs},values);
 }
 async transact(operations){
  if(!await this.connect())throw new Error('db_not_verified');
  const conn=await this.pool.getConnection();
  let started=false;
  try{
   await conn.beginTransaction();started=true;
   for(const [sql,values]of operations)await conn.execute({sql,timeout:this.config.timeoutMs},values);
   await conn.commit();
  }catch{
   if(started)try{await conn.rollback();}catch{}
   this.failure();throw new Error('transaction_failed');
  }finally{conn.release();}
 }
 async close(){if(this.pool&&typeof this.pool.end==='function')await this.pool.end();}
 publicStatus(){return {...this.state,lastDiagnostics:this.lastDiagnostics?.map(s=>String(s).slice(0,100))||[]};}
}

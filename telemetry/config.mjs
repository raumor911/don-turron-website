export const SITE_ID='don-turron';
export function settings(env=process.env){
 if(env.TELEMETRY_SITE_ID && env.TELEMETRY_SITE_ID!==SITE_ID) throw new Error('site_id_mismatch');
 const host=(env.TELEMETRY_SITE_HOST||'').trim().toLowerCase();
 if(host && (!/^[a-z0-9.-]+$/.test(host)||host.includes('..')))throw new Error('invalid_site_host');
 const port=Number(env.DB_PORT||3306);
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('invalid_db_port');
 const enabled=env.TELEMETRY_ENABLED==='true';
 return Object.freeze({siteId:SITE_ID,enabled,writeApproved:env.TELEMETRY_WRITE_APPROVED==='true',
 host,dbHost:env.DB_HOST||'',dbPort:port,dbName:env.DB_NAME||'u345974778_rauviaplatform',
 dbUser:env.DB_USER||'',dbPassword:env.DB_PASSWORD||'',
 poolLimit:3,queueLimit:30,timeoutMs:3000,backoffMs:30000,
 dbConfigured:Boolean(env.DB_HOST&&env.DB_USER&&env.DB_PASSWORD&&env.DB_NAME==='u345974778_rauviaplatform')});
}

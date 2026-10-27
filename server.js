/**
 * Don Turrón | Hostinger Node.js / Express entry point.
 *
 * Serve only the public prerendered documents and assets. Private MySQL,
 * telemetry, knowledge, tests, SQL migrations and source files are NOT static.
 * All database credentials are read exclusively in api/catalog.js on server.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import catalogHandler from './api/catalog.js';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ROOT_FILES=new Set([
  'favicon.ico','fonts.css','styles.css','site.css','premium.css','gallery.css',
  'config.js','catalog.js','app.js','premium.js','gallery.js','telemetry-client.js',
  'robots.txt','sitemap.xml','llms.txt','llms-full.txt'
]);
const staticOptions={dotfiles:'deny',index:['index.html'],redirect:true,fallthrough:false,maxAge:'5m'};

export function createApp(){
  const app=express();
  app.disable('x-powered-by');
  app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');next();});
  // Read-only MySQL adapter. A failed MySQL connection is HTTP 503 on this
  // endpoint, never a failed homepage or a failed server startup.
  app.all('/api/catalog',(req,res)=>catalogHandler(req,res));
  app.get('/api/healthz',(_req,res)=>res.set('Cache-Control','no-store').json({status:'ok',service:'don-turron'}));

  // Reuse the existing telemetry receiver *unchanged* when the Hostinger
  // process has the separate DB_* and TELEMETRY_* configuration. No new DB
  // pool, schema or event logic is introduced here. Lazy loading keeps a
  // telemetry misconfiguration from preventing the website from starting.
  let telemetryReceiver;
  const getTelemetry=()=>telemetryReceiver??=import('./telemetry/receiver.mjs')
    .then(({createReceiver})=>createReceiver());
  const delegateTelemetry=async(req,res)=>{
    try{
      const receiver=await getTelemetry();
      receiver.server.emit('request',req,res);
    }catch{
      if(!res.headersSent)res.status(503).json({error:'telemetry_unavailable'});
    }
  };
  app.all(['/api/telemetry','/api/telemetry/config'],delegateTelemetry);
  app.use('/api',(_req,res)=>res.status(404).json({error:'not_found'}));

  for(const directory of ['assets','productos','guia','ai']){
    app.use('/'+directory,express.static(path.join(ROOT,directory),staticOptions));
  }
  for(const name of PUBLIC_ROOT_FILES){
    app.get('/'+name,(req,res)=>res.sendFile(path.join(ROOT,name),{
      headers:{'Cache-Control':name.endsWith('.xml')||name.endsWith('.txt')?'no-cache':'public, max-age=300'}
    }));
  }
  app.get(['/', '/index.html'],(_req,res)=>res.sendFile(path.join(ROOT,'index.html'),{
    headers:{'Cache-Control':'no-cache'}
  }));
  // Deliberately do not expose repository root through express.static(ROOT).
  app.use((_req,res)=>res.status(404).type('text/plain').send('Not found'));
  return app;
}

export function startServer(){
  const port=Number(process.env.PORT||3000);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
  const app=createApp();
  const server=app.listen(port,'0.0.0.0',()=>{
    process.stdout.write('Don Turrón HTTP server ready on port '+port+'\n');
  });
  return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  startServer();
}

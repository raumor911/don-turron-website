/**
 * Don Turrón | Hostinger Node.js / Express entry point.
 *
 * Serve only the public prerendered documents and assets. Private MySQL,
 * telemetry, knowledge, tests, SQL migrations and source files are NOT static.
 * All database credentials are read exclusively in api/catalog.js on server.
 */
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import { fileURLToPath } from 'node:url';
import catalogHandler,{readCatalogSnapshot} from './api/catalog.js';
import {renderHome,renderProductPage,publicSitemap,catalogMarkdown,liveGraph} from './server/catalog-public.js';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ROOT=path.join(ROOT,'dist','public');
const PUBLIC_ROOT_FILES=new Set([
  'favicon.ico','fonts.css','styles.css','site.css','premium.css','gallery.css',
  'config.js','catalog.js','app.js','premium.js','gallery.js','telemetry-client.js',
  'robots.txt','sitemap.xml','llms.txt','llms-full.txt'
]);
const staticOptions={dotfiles:'deny',index:['index.html'],redirect:true,fallthrough:false,maxAge:'5m'};

export function createApp({readCatalog=readCatalogSnapshot}={}){
  // Production always serves the verified public build; no silent source fallback.
  for(const file of ['index.html','robots.txt','sitemap.xml']){
    if(!fs.existsSync(path.join(PUBLIC_ROOT,file))){
      throw new Error('DT_HOSTINGER_BUILD_MISSING: '+file+' — run npm run build or enable postinstall');
    }
  }
  // Script URL is content-addressed so a past 5-minute browser cache cannot
  // keep the previous add-to-selection logic after a deployment.
  const jsVersion=createHash('sha256').update(fs.readFileSync(path.join(PUBLIC_ROOT,'app.js'))).digest('hex').slice(0,12);
  const freshClient=html=>html.replace('<script defer src="app.js"></script>',
    '<script defer src="app.js?v='+jsVersion+'"></script>');
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


  // Canonical catalog projections all use the same read-only 5s MySQL snapshot.
  const live=async(res,render)=>{
    try{
      const snapshot=await readCatalog();
      res.set('Cache-Control','public, max-age=0, s-maxage=5, must-revalidate');
      return render(snapshot.body.products);
    }catch{return res.status(503).set('Cache-Control','no-store').json({error:'catalog_temporarily_unavailable'});}
  };
  app.get(['/', '/index.html'],async(req,res)=>{
    try{
      const snapshot=await readCatalog();
      const html=freshClient(renderHome(fs.readFileSync(path.join(PUBLIC_ROOT,'index.html'),'utf8'),snapshot.body.products));
      return res.set('Cache-Control','public, max-age=0, s-maxage=5, must-revalidate').type('html').send(html);
    }catch{
      let html=fs.readFileSync(path.join(PUBLIC_ROOT,'index.html'),'utf8');
      html=html.replace(/<div class="product-grid" id="product-grid"><!-- DT-CATALOG-START -->[\s\S]*?<!-- DT-CATALOG-END --><\/div>/,
        '<div class="product-grid" id="product-grid"></div>');
      html=html.replace('<script defer src="catalog.js"></script>','<script>window.DON_TURRON_CATALOG=[];</script>');
      html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,'');
      return res.set('Cache-Control','no-store').set('X-Robots-Tag','noindex').type('html').send(freshClient(html));
    }
  });
  app.get(['/productos/:id/','/productos/:id'],(req,res)=>live(res,products=>{
    const id=req.params.id;
    if(!/^[a-z0-9-]{1,96}$/.test(id))return res.status(404).set('X-Robots-Tag','noindex').end();
    const p=products.find(x=>x.id===id);
    if(!p)return res.status(404).set('X-Robots-Tag','noindex').type('text/plain').send('Producto no publicado');
    const template=fs.readFileSync(path.join(PUBLIC_ROOT,'productos','estuche-viaje','index.html'),'utf8');
    return res.type('html').send(renderProductPage(p,products,template));
  }));
  app.get('/sitemap.xml',(req,res)=>live(res,p=>res.type('application/xml').send(publicSitemap(p))));
  app.get('/catalog.js',(req,res)=>live(res,p=>res.type('application/javascript').send(
    'window.DON_TURRON_CATALOG='+JSON.stringify(p).replace(/</g,'\\u003c')+';'
  )));
  app.get('/ai/products.json',(req,res)=>live(res,p=>res.json({products:p})));
  app.get('/ai/knowledge-graph.json',(req,res)=>live(res,p=>{
    const baseline=JSON.parse(fs.readFileSync(path.join(PUBLIC_ROOT,'ai','knowledge-graph.json'),'utf8'));
    return res.json(liveGraph(p,baseline));
  }));
  app.get('/ai/catalog.md',(req,res)=>live(res,p=>res.type('text/markdown').send(catalogMarkdown(p))));
  app.get('/llms.txt',(req,res)=>live(res,p=>res.type('text/plain').send(
    '# Don Turrón\n\nCatálogo vigente: /ai/catalog.md\nProductos: /ai/products.json\n\nConsultas por WhatsApp; sin reservas automáticas.')));
  app.get('/llms-full.txt',(req,res)=>live(res,p=>res.type('text/plain').send(catalogMarkdown(p))));

  // Optional persistent Hostinger media folder: outside the generated dist/
  // tree so Kyberion can add photos without rebuilding Node.js artifacts.
  const mediaDir=process.env.DT_MEDIA_DIR;
  if(mediaDir && path.isAbsolute(mediaDir) && path.basename(path.normalize(mediaDir))==='products' &&
     fs.existsSync(mediaDir)){
    app.get('/media/products/:file',(req,res)=>{
      if(!/^[a-z0-9-]+\.(?:webp|avif|jpg|jpeg|png)$/.test(req.params.file)){
        return res.status(404).end();
      }
      return res.sendFile(path.join(mediaDir,req.params.file),{
        dotfiles:'deny',headers:{'Cache-Control':'public, max-age=300'}
      },error=>{if(error&&!res.headersSent)res.status(error.status||404).end();});
    });
  }
  // Do not expose old prerendered /productos/*/index.html from dist/public:
  // a hidden product must not survive through an alternate static URL.
  app.use('/productos',(_req,res)=>res.status(404).set('X-Robots-Tag','noindex').end());
  for(const directory of ['assets','guia','ai']){
    app.use('/'+directory,express.static(path.join(PUBLIC_ROOT,directory),staticOptions));
  }
  for(const name of PUBLIC_ROOT_FILES){
    app.get('/'+name,(req,res)=>res.sendFile(path.join(PUBLIC_ROOT,name),{
      headers:{'Cache-Control':name==='app.js'||name==='config.js'||name==='catalog.js'||name.endsWith('.xml')||name.endsWith('.txt')?'no-cache, must-revalidate':'public, max-age=300'}
    }));
  }

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

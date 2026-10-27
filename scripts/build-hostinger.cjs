'use strict';
/**
 * Prepare a deployable Hostinger build without migrating the Vanilla JS frontend.
 * Private source, env, SQL and telemetry are deliberately NOT copied to dist/public.
 */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const target=path.join(root,'dist');
const stage=path.join(root,'.dist-preparing');
const publicDir=path.join(stage,'public');

const rootAssets=[
  'index.html','favicon.ico','fonts.css','styles.css','site.css',
  'premium.css','gallery.css','config.js','catalog.js','app.js',
  'premium.js','gallery.js','telemetry-client.js',
  'robots.txt','sitemap.xml','llms.txt','llms-full.txt'
];
const directories=['assets','productos','guia','ai'];

function requireFile(rel){
  const file=path.join(root,rel);
  if(!fs.statSync(file,{throwIfNoEntry:false})?.isFile())throw Error('Required public artifact missing: '+rel);
  return file;
}
function deploy(){
  fs.rmSync(stage,{recursive:true,force:true});
  fs.mkdirSync(publicDir,{recursive:true});
  for(const file of rootAssets)fs.copyFileSync(requireFile(file),path.join(publicDir,file));
  for(const directory of directories){
    const input=path.join(root,directory);
    if(!fs.statSync(input,{throwIfNoEntry:false})?.isDirectory())throw Error('Missing public directory: '+directory);
    fs.cpSync(input,path.join(publicDir,directory),{recursive:true,errorOnExist:true,force:false});
  }
  const pages=fs.readdirSync(path.join(publicDir,'productos'),{withFileTypes:true})
    .filter(entry=>entry.isDirectory()&&fs.existsSync(path.join(publicDir,'productos',entry.name,'index.html')));
  if(pages.length!==8)throw Error('Expected eight prerendered product pages, received '+pages.length);
  const sitemap=fs.readFileSync(path.join(publicDir,'sitemap.xml'),'utf8');
  if((sitemap.match(/<loc>/g)||[]).length!==10)throw Error('Production sitemap must contain 10 URLs');
  const html=fs.readFileSync(path.join(publicDir,'index.html'),'utf8');
  if(!html.includes('name="robots" content="index, follow"'))throw Error('Production homepage must be indexable');
  const robots=fs.readFileSync(path.join(publicDir,'robots.txt'),'utf8');
  if(!robots.includes('Allow: /')||robots.includes('Disallow: /'))throw Error('Production robots must permit crawling');

  // Hostinger entry point is a small CommonJS launcher; the Express server
  // and MySQL/telemetry adapters stay private at the repository root.
  fs.writeFileSync(path.join(stage,'server.cjs'),[
    "'use strict';",
    "import('../server.js').then(({startServer})=>startServer()).catch(error=>{",
    "  console.error('DT_HOSTINGER_START_FAILED',error?.stack||String(error));",
    "  process.exitCode=1;",
    "});",
    ""
  ].join('\n'),'utf8');
  if(!fs.existsSync(path.join(stage,'server.cjs')))throw Error('Node entry point was not created');
  fs.rmSync(target,{recursive:true,force:true});
  fs.renameSync(stage,target);
  console.log('DT_HOSTINGER_BUILD_READY: dist/server.cjs, dist/public/, 8 product pages, 10 sitemap URLs');
}
try{deploy();}catch(error){
  fs.rmSync(stage,{recursive:true,force:true});
  console.error('DT_HOSTINGER_BUILD_FAILED:',error?.message||error);
  process.exitCode=1;
}

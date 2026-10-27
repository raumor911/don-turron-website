'use strict';
// Hostinger's GitHub Web App flow can install packages without invoking the
// project build command. Match RAUVIA: always produce and verify the runtime
// bundle during npm install (unless scripts are explicitly disabled).
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{
  cwd:ROOT,stdio:'inherit',env:process.env
});
if(result.error){
  console.error('DT_HOSTINGER_INSTALL_FAILED:',result.error.message);
  process.exit(1);
}
if(result.status!==0){
  console.error('DT_HOSTINGER_INSTALL_FAILED: production build returned '+result.status);
  process.exit(result.status||1);
}
for(const rel of ['dist/server.cjs','dist/public/index.html','dist/public/robots.txt','dist/public/sitemap.xml','dist/public/productos/estuche-viaje/index.html']){
  if(!fs.existsSync(path.join(ROOT,rel))){
    console.error('DT_HOSTINGER_INSTALL_FAILED: missing '+rel);
    process.exit(1);
  }
}
console.log('DT_HOSTINGER_INSTALL_READY: production artifacts verified.');

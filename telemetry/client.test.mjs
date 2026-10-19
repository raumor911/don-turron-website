import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../telemetry-client.js',import.meta.url),'utf8');
function browser({dnt='0',gpc=false,active=true}={}){
 const requests=[],handlers=new Map(),storage=new Map();
 const sandbox={
  navigator:{doNotTrack:dnt,globalPrivacyControl:gpc,userAgent:'Mozilla/5.0',sendBeacon:()=>false},
  crypto:{randomUUID:()=>'123e4567-e89b-42d3-a456-426614174000'},
  sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  location:{pathname:'/'},innerWidth:900,
  window:{addEventListener:(name,cb)=>handlers.set(name,cb)},
  document:{addEventListener:()=>{},querySelectorAll:()=>[]},
  fetch:async(url,options={})=>{
   requests.push({url,options});
   if(url==='/api/telemetry/config')return {ok:true,json:async()=>({enabled:active,site_id:'don-turron'})};
   return {ok:true};
  },
  AbortController,
  Blob,
  setTimeout:()=>1,
  clearTimeout:()=>{}
 };
 vm.runInNewContext(source,sandbox,{filename:'telemetry-client.js'});
 return {requests,handlers,settle:()=>new Promise(resolve=>setImmediate(resolve))};
}
test('DNT and GPC prevent even config request',async()=>{
 for(const privacy of [{dnt:'1'},{gpc:true}]){
  const b=browser(privacy);await b.settle();assert.equal(b.requests.length,0);
 }
});
test('Disabled config fails open without events',async()=>{
 const b=browser({active:false});await b.settle();
 assert.equal(b.requests.length,1);assert.equal(b.requests[0].url,'/api/telemetry/config');
});
test('Enabled client sends only whitelisted product interaction fields',async()=>{
 const b=browser();await b.settle();
 const handler=b.handlers.get('dt:interaction');
 assert.equal(typeof handler,'function');
 handler({detail:{event:'product_view',product_id:'cenicero-mesa',email:'hidden@example.com',message:'private'}});
 handler({detail:{event:'purchase',product_id:'cenicero-mesa'}}); // not allowed
 await b.settle();
 const posts=b.requests.filter(x=>x.url==='/api/telemetry');
 assert.equal(posts.length,2); // page_view and product_view
 const event=JSON.parse(posts[1].options.body);
 assert.equal(event.event,'product_view');
 assert.equal(event.properties.product_id,'cenicero-mesa');
 assert.equal(JSON.stringify(event).includes('hidden@example.com'),false);
 assert.equal(JSON.stringify(event).includes('private'),false);
 assert.equal(event.path,'/');
 assert.equal(event.site_id,undefined);
});

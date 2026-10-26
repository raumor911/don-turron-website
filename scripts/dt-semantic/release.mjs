import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
export const release=JSON.parse(fs.readFileSync(new URL('../../semantic-release.json',import.meta.url),'utf8'));
export function validateRelease(r){
  if(r.publishOffers!==false||r.enableCommerce!==false||r.indexNow!==false)throw new Error('Checkout, Offers and IndexNow are not implemented or authorized by publication alone');
  if(r.mode==='prelaunch'){
    if(r.enableIndexing!==false||r.verifiedDomain!==null)throw new Error('Prelaunch must not publish an origin or enable indexing');
  }else if(r.mode==='production'){
    const url=new URL(r.verifiedDomain);
    if(r.enableIndexing!==true||url.protocol!=='https:'||url.origin!==r.verifiedDomain||url.username||url.password)throw new Error('Production requires a verified HTTPS origin and indexing');
  }else throw new Error('Unknown release mode');
  return r;
}
validateRelease(release);
export const robots=release.enableIndexing?'index, follow':'noindex, nofollow';
export function publishMetadata(html,route){
  html=html.replace(/<meta name="robots" content="[^"]*"\s*\/?>/,'<meta name="robots" content="'+robots+'">');
  html=html.replace(/\s*<link rel="canonical"[^>]*>/g,'').replace(/\s*<meta property="og:url"[^>]*>/g,'');
  if(release.enableIndexing){
    const canonical=new URL(route,release.verifiedDomain).href;
    html=html.replace(/\s*<\/head>/,'\n<link rel="canonical" href="'+canonical+'">\n<meta property="og:url" content="'+canonical+'">\n</head>');
    html=html.replace(/(<meta property="og:image" content=")([^"\s]+)("\s*\/?>)/g,(_,a,b,c)=>a+new URL(b,canonical).href+c);
  }
  return html;
}
export function absoluteSchema(value,route){
  if(!release.enableIndexing)return value;
  const base=new URL(route,release.verifiedDomain);
  const convert=(v,key)=>{
    if(Array.isArray(v))return v.map(x=>convert(x,key));
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,convert(x,k)]));
    if(typeof v==='string'&&['@id','url','image','item'].includes(key))return new URL(v,base).href;
    return v;
  };
  return convert(value);
}

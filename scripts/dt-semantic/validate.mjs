import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DIR=path.join(ROOT,'knowledge');
export const FILES=['brand','organization','collections','categories','products','use-cases','intents','faq','canonical-answers','claims','sources','terminology'];
const ERRORS=[];
const check=(ok,message)=>{if(!ok)ERRORS.push(message);};
export function load(){return Object.fromEntries(FILES.map(name=>[name,JSON.parse(fs.readFileSync(path.join(DIR,name+'.json'),'utf8'))]));}
export function validate(data=load()){
  ERRORS.length=0;
  const all=new Map();
  for(const [kind,entries] of Object.entries(data)){
    for(const e of (Array.isArray(entries)?entries:[entries])){
      check(typeof e.id==='string' && !!e.id,kind+': missing id');
      if(all.has(e.id)) check(false,'duplicate id '+e.id);
      all.set(e.id,{kind,entity:e});
    }
  }
  const enums={contentStatus:['conceptual','documented','verified'],commercialStatus:['not_configured','pending_confirmation','available','unavailable'],visibility:['internal','public_preview','public'],claimStatus:['verified','supplier_declared','pending','disputed','rejected']};
  for(const p of data.products){
    for(const key of ['id','name','category','categoryLabel','subtitle','description','art','badge'])check(typeof p[key]==='string','product '+p.id+': '+key);
    for(const k of ['contentStatus','commercialStatus','visibility'])check(enums[k].includes(p[k]),p.id+': invalid '+k);
    check(Array.isArray(p.features)&&p.features.length>0,p.id+': missing features');
    check(Array.isArray(p.images),p.id+': images must be list');
    check(Array.isArray(p.variants),p.id+': variants must be list');
    check(p.categoryId==='category:'+p.category,'category mismatch '+p.id);
    check(p.commercialStatus!=='available','unverified inventory not permitted '+p.id);
    if(p.contentStatus==='conceptual')check(p.commercialStatus==='not_configured' && p.images.length===0,'conceptual product exposed as offer '+p.id);
    for(const image of p.images||[]){
      check(/^assets\/products\/[a-z0-9-]+\.webp$/.test(image.src),p.id+': invalid image path');
      check(fs.existsSync(path.join(ROOT,image.src)),p.id+': missing image '+image.src);
    }
    if(p.id==='reposa-puros-plegable')check(p.variants.map(x=>x.label).join('|')==='Plata|Negro' && p.variants.every(x=>!x.sku&&!x.stock), 'unconfirmed variants');
    if(p.id==='cortador-v-geometrico')check(p.variants.map(x=>x.label).join('|')==='Plateado|Dorado' && p.variants.every(x=>!x.sku&&!x.stock),'unconfirmed cortador variants');
    if(p.id==='encendedor-sarike-butano')check(p.variants.map(x=>x.label).join('|')==='Plata|Dorado' && p.variants.every(x=>!x.sku&&!x.stock),'unconfirmed Sarike variants');
  }
  check(data.products.length===8,'exactly eight products expected');
  check(data.products.filter(p=>p.contentStatus==='documented').length===7,'seven documented products expected');
  check(data.products.some(p=>p.id==='encendedor-jet'&&p.contentStatus==='conceptual'),'encendedor conceptual missing');
  const known=['encendedor-jet','humidor-viaje-5-puros','cenicero-mesa','estuche-viaje','estuche-kit-viaje','reposa-puros-plegable','cortador-v-geometrico','encendedor-sarike-butano'];
  check(data.products.map(p=>p.id).join('|')===known.join('|'),'product IDs/order changed');
  for(const claim of data.claims){
    check(enums.claimStatus.includes(claim.status),'invalid claim status '+claim.id);
    check(enums.visibility.includes(claim.visibility),'invalid claim visibility');
    check(typeof claim.statement==='string' && claim.statement.length>0,'empty claim '+claim.id);
    check(['stable','periodic','volatile'].includes(claim.volatility),'invalid volatility '+claim.id);
    check(Array.isArray(claim.sourceIds)&&claim.sourceIds.length>0,'unsourced claim '+claim.id);
  }
  for(const [kind,entries] of Object.entries(data)){
    for(const entry of (Array.isArray(entries)?entries:[entries])){
      for(const [key,value] of Object.entries(entry)){
        if(key.endsWith('Id') && typeof value==='string')check(all.has(value),'dangling '+kind+'.'+key+' '+value);
        if(key.endsWith('Ids') && Array.isArray(value))for(const id of value)check(all.has(id),'dangling '+kind+'.'+key+' '+id);
      }
    }
  }
  for(const source of data.sources)check(!!source.path && fs.existsSync(path.join(ROOT,source.path)),'unknown source '+source.id);
  for(const intent of data.intents){
    check(Array.isArray(intent.exampleExpressions)&&Array.isArray(intent.productIds)&&Array.isArray(intent.useCaseIds),'intent incomplete '+intent.id);
    check(intent.status==='hypothesis' && intent.searchVolumeEvidence===false,'intent without demand evidence must be hypothesis '+intent.id);
  }
  for(const answer of data['canonical-answers'])check(Array.isArray(answer.sourceIds)&&answer.sourceIds.length>0,'canonical answer without sources '+answer.id);
  const raw=JSON.stringify(data);
  const forbidden=[/sk-proj-/i,/BEGIN PRIVATE KEY/i,/acquisitionCost/i,/purchaseCost/i,/grossMargin/i,/multiplicador/i,/\bexample\.com\b/i,/\bInStock\b/i,/\bAggregateRating\b/];
  for(const f of forbidden)check(!f.test(raw),'private or unsupported term: '+f);
  const errors=[...ERRORS]; if(errors.length)throw new Error(errors.join('\n'));
  return {entities:all.size,products:data.products.length,claims:data.claims.length,intents:data.intents.length};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  console.log('DT-SC-001 VALID '+JSON.stringify(validate()));
}

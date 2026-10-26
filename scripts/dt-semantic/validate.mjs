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
    // El precio es información pública y no confirma inventario ni habilita comercio.
    const hasPrice=Object.prototype.hasOwnProperty.call(p,'retailPrice');
    if(hasPrice){
      const v=p.retailPrice;
      check(v&&typeof v==='object'&&Number.isInteger(v.amount)&&v.amount>0,p.id+': positive integer public price required');
      check(v?.currency==='MXN'&&v?.taxIncluded===true&&v?.shippingIncluded===false,p.id+': price must be MXN, IVA included, shipping separate');
      check(!p.launchWindow,p.id+': upcoming product must not publish a price');
      check(p.contentStatus==='documented',p.id+': cannot price conceptual product');
    } else check(!!p.launchWindow,p.id+': missing price for existing catalog item');

    if(p.contentStatus==='conceptual')check(p.commercialStatus==='not_configured' && p.images.length===0,'conceptual product exposed as offer '+p.id);
    for(const image of p.images||[]){
      check(/^assets\/products\/[a-z0-9-]+\.webp$/.test(image.src),p.id+': invalid image path');
      check(fs.existsSync(path.join(ROOT,image.src)),p.id+': missing image '+image.src);
    }
    if(p.id==='reposa-puros-plegable')check(p.variants.map(x=>x.label).join('|')==='Plata|Negro' && p.variants[0]?.stock===2 && p.variants[1]?.stock===1 && p.variants.every(x=>x.status==='confirmed'&&!x.sku) && p.commercialStatus==='pending_confirmation', 'invalid confirmed stock or prelaunch gate for reposa puros');
    if(p.id==='cortador-v-geometrico')check(p.variants.map(x=>x.label).join('|')==='Plateado|Dorado' && p.variants.every(x=>!x.sku&&!x.stock),'unconfirmed cortador variants');
    if(p.id==='encendedor-sarike-butano')check(p.variants.map(x=>x.label).join('|')==='Plata|Dorado' && p.variants.every(x=>!x.sku&&!x.stock),'unconfirmed Parike variants');
    if(p.id==='encendedor-honest-punch')check(p.variants.map(x=>x.label).join('|')==='Negro|Rojo' && p.variants.every(x=>!x.sku&&!x.stock),'unconfirmed HONEST variants');
    if(p.manufacturerBrand!==undefined)check(typeof p.manufacturerBrand==='string'&&!!p.manufacturerBrand,p.id+': invalid manufacturer brand');
    // Planned launch months never constitute stock confirmation or a commercial Offer.
    if(['cortador-v-geometrico','encendedor-sarike-butano','encendedor-honest-punch'].includes(p.id)){
      check(p.badge==='PRÓXIMAMENTE',p.id+': unexpected upcoming badge');
      check(p.launchWindow?.status==='planned' && p.launchWindow.month==='2027-01' && p.launchWindow.label==='Disponibilidad prevista: enero de 2027' && p.launchWindow.source==='brand_owner_statement',p.id+': invalid planned month');
      check(p.commercialStatus==='pending_confirmation',p.id+': release plan cannot activate commerce');
    } else check(p.launchWindow===undefined,p.id+': unexpected launch window');
  }
  check(data.products.filter(p=>p.retailPrice).length===5,'exactly five priced accessories');
  check(data.products.length===8,'exactly eight documented products expected');
  check(data.products.filter(p=>p.contentStatus==='documented').length===8,'eight documented products expected');
  check(!data.products.some(p=>p.id==='encendedor-jet'),'unsupported conceptual jet product must not return');
  const known=['humidor-viaje-5-puros','cenicero-mesa','estuche-viaje','estuche-kit-viaje','reposa-puros-plegable','cortador-v-geometrico','encendedor-sarike-butano','encendedor-honest-punch'];
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

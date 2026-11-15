/**
 * Release bridge for the three products approved in GitHub.
 *
 * Hostinger SSR and /api/catalog historically used an older MySQL editorial
 * snapshot (three "coming_soon" entries with null prices). A rebuild alone
 * cannot change that snapshot. For ONLY these three IDs, the reviewed catalog
 * defines public copy, MXN/IVA prices and declared color availability.
 *
 * MySQL remains authoritative for product visibility (hidden/removed means
 * absent), global Out of stock and independently recorded positive/zero stock.
 * A missing quantity is NOT converted to a fictitious unit count.
 * Existing five products and future DB-only products are never modified.
 */
import fs from 'node:fs';

const approvedAmounts=Object.freeze({
  'cortador-v-geometrico':479,
  'encendedor-sarike-butano':719,
  'encendedor-honest-punch':489
});
const raw=JSON.parse(fs.readFileSync(new URL('../knowledge/products.json',import.meta.url),'utf8'));
const released=new Map();
for(const [id,amount] of Object.entries(approvedAmounts)){
  const product=raw.find(p=>p.id===id);
  if(!product||product.retailPrice?.amount!==amount||
     product.retailPrice?.currency!=='MXN'||product.retailPrice?.taxIncluded!==true||
     product.retailPrice?.shippingIncluded!==false||
     product.commercialStatus!=='available'||product.launchWindow||
     !Array.isArray(product.variants)||product.variants.length<2||
     product.variants.some(v=>!['available','unavailable'].includes(v.status))) {
    throw new Error('DT_CATALOG_RELEASE_INVALID: '+id);
  }
  if(id==='encendedor-sarike-butano' &&
     (product.variants[0].label!=='Plata'||product.variants[0].status!=='unavailable'||
      product.variants[0].stock!==0||product.variants[1].label!=='Dorado'||
      product.variants[1].status!=='available')) {
    throw new Error('DT_CATALOG_RELEASE_INVALID: silver Parike must be blocked');
  }
  released.set(id,product);
}

function reconcileVariants(approved,dbVariants=[]){
  return approved.map(variant=>{
    const db=dbVariants.find(v=>v.label===variant.label);
    const stock=Number.isInteger(db?.stock)&&db.stock>=0?db.stock:null;
    // A declared unavailable finish is blocked even if older DB rows disagree.
    if(variant.status==='unavailable')
      return {label:variant.label,...(db?.key?{key:db.key}:{}),status:'unavailable',stock:0};
    // Real MySQL counts, if present, always take precedence over an availability
    // statement. Zero must never become selectable via the release manifest.
    if(stock!==null)
      return {label:variant.label,...(db?.key?{key:db.key}:{}),
        status:stock===0?'unavailable':'confirmed',stock};
    return {label:variant.label,...(db?.key?{key:db.key}:{}),
      status:'available',stock:null};
  });
}

export function reconcileApprovedCatalog(products){
  if(!Array.isArray(products))throw new TypeError('products must be an array');
  return products.map(databaseProduct=>{
    const editorial=released.get(databaseProduct.id);
    if(!editorial)return databaseProduct;
    const overallSoldOut=databaseProduct.publicationStatus==='Out of stock';
    const variants=reconcileVariants(editorial.variants,databaseProduct.variants);
    return {...databaseProduct,
      name:editorial.name,category:editorial.category,
      categoryLabel:editorial.categoryLabel,
      subtitle:editorial.subtitle,description:editorial.description,
      features:editorial.features.map(x=>x),
      images:editorial.images.map(image=>({...image})),
      art:editorial.art,manufacturerBrand:editorial.manufacturerBrand||null,
      badge:editorial.badge,
      retailPrice:{...editorial.retailPrice},
      launchWindow:null,variants,
      commercialStatus:overallSoldOut?'unavailable':'available',
      publicationStatus:overallSoldOut?'Out of stock':'listed'
    };
  });
}

export const releasedPriceIds=Object.freeze(Object.keys(approvedAmounts));

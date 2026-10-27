// Lectura pública del catálogo Don Turrón para Express en Hostinger.
import mysql from 'mysql2/promise';
import {createHash} from 'node:crypto';
import {createCatalogCache} from './catalog-cache.js';

const expectedDatabase='u345974778_donturron';
const configured=Boolean(process.env.DT_DB_HOST && process.env.DT_DB_USER && process.env.DT_DB_PASSWORD && process.env.DT_DB_NAME===expectedDatabase);
let pool;
const snapshotCache=createCatalogCache({ttlMs:5000});
function connection(){
  if (!configured) return null;
  if (!pool) pool=mysql.createPool({
    host:process.env.DT_DB_HOST,
    port:Number(process.env.DT_DB_PORT||3306),
    user:process.env.DT_DB_USER,
    password:process.env.DT_DB_PASSWORD,
    database:expectedDatabase,
    waitForConnections:true,
    connectionLimit:2,
    queueLimit:4,
    connectTimeout:2000,
    enableKeepAlive:false,
    timezone:'Z'
  });
  return pool;
}
const clean=(v,max=1000)=>typeof v==='string'?v.slice(0,max):'';
const imagePath=/^assets\/products\/[a-z0-9-]+\.webp$/;
const assetName=/^[a-z0-9-]+$/;
function arrayJson(value,max=16){
  try {const v=typeof value==='string'?JSON.parse(value):value;return Array.isArray(v)?v.slice(0,max):[];}catch{return [];}
}
function publicProduct(row){
  const upcoming=row.publication_status==='coming_soon';
  const amount=row.retail_price==null?null:Number(row.retail_price);
  const hasPrice=!upcoming&&Number.isFinite(amount)&&amount>=0;
  const result={
    id:row.product_id,
    name:clean(row.name,200),
    category:clean(row.category,64),
    categoryLabel:clean(row.category_label,100),
    subtitle:clean(row.subtitle,250),
    description:clean(row.description,10000),
    features:arrayJson(row.features_json,24).filter(x=>typeof x==='string').map(x=>clean(x,500)),
    images:arrayJson(row.images_json,16).filter(x=>x&&typeof x==='object'&&imagePath.test(x.src))
      .map(x=>({src:x.src,label:clean(x.label,200)})),
    art:assetName.test(row.art)?row.art:'case',
    badge:clean(row.badge,80),
    retailPrice:hasPrice?{amount,currency:'MXN',taxIncluded:true,shippingIncluded:false}:null,
    variants:[],
    stock:null,
    launchWindow:upcoming&&/^\d{4}-(0[1-9]|1[0-2])$/.test(row.launch_month||'')
      ?{status:'planned',month:row.launch_month,label:'Disponibilidad prevista: '+new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(row.launch_month+'-01T12:00:00Z'))}:null
  };
  return result;
}
export default async function handler(req,res){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Access-Control-Allow-Origin','https://www.donturron.com.mx');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'method_not_allowed'});
  }
  if (!configured){
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({error:'catalog_unavailable'});
  }
  try {
    const snapshot=await snapshotCache.read(async()=>{
    const db=connection();
    const [rows]=await db.query(`
      SELECT p.product_id,p.name,p.retail_price,p.publication_status,p.launch_month,
             c.category,c.category_label,c.subtitle,c.description,c.features_json,
             c.images_json,c.art,c.badge,c.manufacturer_brand,c.sort_order,
             v.sku,v.variant_key,v.variant_label,
             i.on_hand_qty,i.reserved_qty
      FROM dt_products p
      INNER JOIN dt_product_content c ON c.product_id=p.product_id
      LEFT JOIN dt_variants v ON v.product_id=p.product_id AND v.is_active=1
      LEFT JOIN dt_inventory i ON i.sku=v.sku
      WHERE p.publication_status IN ('listed','coming_soon')
      ORDER BY c.sort_order,p.product_id,v.variant_label
    `);
    const grouped=new Map();
    for(const row of rows){
      if(!grouped.has(row.product_id))grouped.set(row.product_id,publicProduct(row));
      const product=grouped.get(row.product_id);
      if(!row.sku)continue;
      const known=row.on_hand_qty!==null&&row.on_hand_qty!==undefined;
      const available=known?Math.max(0,Number(row.on_hand_qty)-Number(row.reserved_qty||0)):null;
      const variant={key:row.variant_key,label:clean(row.variant_label,80),
                     status:known?'confirmed':'pending_confirmation',stock:available};
      if(row.variant_key==='default')product.stock=available;
      else product.variants.push(variant);
    }
    // A partial catalog is not an authoritative response. Fail closed instead.
    if(grouped.size!==8)throw new Error('incomplete_catalog');
    const body={version:1,source:'don-turron-inventory',products:[...grouped.values()]};
    const etag='"'+createHash('sha256').update(JSON.stringify(body)).digest('hex')+'"';
    return {body,etag};
    });
    // Both browser and Hostinger receive at most ~5s of fresh cache.
    // No stale-while-revalidate on inventory: a failed refresh returns 503.
    res.setHeader('Cache-Control','public, max-age=5, s-maxage=5, must-revalidate');
    res.setHeader('ETag',snapshot.etag);
    if(req.headers?.['if-none-match']?.split(',').map(v=>v.trim()).includes(snapshot.etag)){
      return res.status(304).end();
    }
    return res.status(200).json(snapshot.body);
  }catch(_error){
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({error:'catalog_unavailable'});
  }
}

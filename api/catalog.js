// API pública de catálogo: MySQL de Don Turrón, compatible con Express y Vercel.
// No consulta ni altera la BD independiente de telemetría.
import mysql from 'mysql2/promise';

const expectedDatabase='u345974778_donturron';
const imagePath=/^assets\/products\/[a-z0-9-]+\.webp$/;
const assetName=/^[a-z0-9-]+$/;
let pool;

export function catalogConfig(env=process.env){
  // Hostinger puede importar valores como cadenas con espacios accidentales.
  // La contraseña NO se recorta: sus espacios podrían ser legítimos.
  const cfg={
    host:String(env.DT_DB_HOST||'').trim(),
    port:Number(String(env.DT_DB_PORT||3306).trim()),
    user:String(env.DT_DB_USER||'').trim(),
    password:env.DT_DB_PASSWORD||'',
    database:String(env.DT_DB_NAME||'').trim()
  };
  if(!cfg.host||!cfg.user||!cfg.password||cfg.database!==expectedDatabase||
    !Number.isInteger(cfg.port)||cfg.port<1||cfg.port>65535)return null;
  return cfg;
}
function connection(cfg){
  if(!pool)pool=mysql.createPool({
    host:cfg.host,port:cfg.port,user:cfg.user,password:cfg.password,
    database:cfg.database,waitForConnections:true,connectionLimit:2,
    queueLimit:4,connectTimeout:4000,enableKeepAlive:true,timezone:'Z'
  });
  return pool;
}
function reasonFor(error){
  if(error?.code==='CATALOG_DATA')return 'catalog_data';
  if(['ER_NO_SUCH_TABLE','ER_BAD_FIELD_ERROR','ER_BAD_DB_ERROR'].includes(error?.code))return 'mysql_schema';
  if(['ER_ACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(error?.code))return 'mysql_permissions';
  return 'mysql_connection';
}
const clean=(v,max=1000)=>typeof v==='string'?v.slice(0,max):'';
function arrayJson(value,max=16){
  try{
    const v=typeof value==='string'?JSON.parse(value):value;
    return Array.isArray(v)?v.slice(0,max):[];
  }catch{return [];}
}
function publicProduct(row){
  const upcoming=row.publication_status==='coming_soon';
  const amount=row.retail_price==null?null:Number(row.retail_price);
  const hasPrice=!upcoming&&Number.isFinite(amount)&&amount>=0;
  return {
    id:row.product_id,
    name:clean(row.name,200),
    category:clean(row.category,64),
    categoryLabel:clean(row.category_label,100),
    subtitle:clean(row.subtitle,250),
    description:clean(row.description,10000),
    features:arrayJson(row.features_json,24).filter(x=>typeof x==='string').map(x=>clean(x,500)),
    images:arrayJson(row.images_json,16).filter(x=>x&&typeof x==='object'&&imagePath.test(x.src))
      .map(x=>({src:x.src,label:clean(x.label,200)})),
    art:assetName.test(row.art||'')?row.art:'case',
    badge:clean(row.badge,80),
    retailPrice:hasPrice?{amount,currency:'MXN',taxIncluded:true,shippingIncluded:false}:null,
    variants:[],stock:null,
    launchWindow:upcoming&&/^\d{4}-(0[1-9]|1[0-2])$/.test(row.launch_month||'')
      ?{status:'planned',month:row.launch_month,label:'Disponibilidad prevista: '+
        new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric',timeZone:'UTC'})
        .format(new Date(row.launch_month+'-01T12:00:00Z'))}:null
  };
}
export function createCatalogHandler({env=process.env,getDb=connection,logger=console}={}){
  const cfg=catalogConfig(env);
  return async function handler(req,res){
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Access-Control-Allow-Origin','https://www.donturron.com.mx');
    if(req.method!=='GET'){
      res.setHeader('Allow','GET');
      return res.status(405).json({error:'method_not_allowed'});
    }
    if(!cfg){
      res.setHeader('Cache-Control','no-store');
      // Sólo categorías de error. Nunca revelar credenciales o SQL al cliente.
      return res.status(503).json({error:'catalog_unavailable',reason:'configuration'});
    }
    try{
      const [rows]=await getDb(cfg).query([
        'SELECT p.product_id,p.name,p.retail_price,p.publication_status,p.launch_month,',
        'c.category,c.category_label,c.subtitle,c.description,c.features_json,',
        'c.images_json,c.art,c.badge,c.manufacturer_brand,c.sort_order,',
        'v.sku,v.variant_key,v.variant_label,i.on_hand_qty,i.reserved_qty',
        'FROM dt_products p',
        'LEFT JOIN dt_product_content c ON c.product_id=p.product_id',
        'LEFT JOIN dt_variants v ON v.product_id=p.product_id AND v.is_active=1',
        'LEFT JOIN dt_inventory i ON i.sku=v.sku',
        "WHERE p.publication_status IN ('listed','coming_soon')",
        'ORDER BY c.sort_order,p.product_id,v.variant_label'
      ].join(' '));
      const grouped=new Map();
      for(const row of rows){
        // Una ficha sin contenido no debe parecer una ficha vacía válida.
        if(!row.category||!row.name||!row.description){
          const error=new Error('public_product_missing_content');
          error.code='CATALOG_DATA';
          throw error;
        }
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
      // La cantidad de artículos publicados es decisión de la BD, no del build.
      // Una tienda sin artículos publicados es una respuesta válida con lista vacía.
      res.setHeader('Cache-Control','public, max-age=0, s-maxage=10, stale-while-revalidate=10');
      return res.status(200).json({version:1,source:'don-turron-inventory',products:[...grouped.values()]});
    }catch(error){
      const reason=reasonFor(error);
      // Sólo categoría y código técnico seguro en el log privado de Hostinger.
      logger.error?.('[DT_CATALOG]',reason,String(error?.code||'UNKNOWN').replace(/[^A-Z0-9_]/gi,'').slice(0,55));
      res.setHeader('Cache-Control','no-store');
      return res.status(503).json({error:'catalog_unavailable',reason});
    }
  };
}
export default createCatalogHandler();

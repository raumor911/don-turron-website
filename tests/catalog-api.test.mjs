import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogConfig,createCatalogHandler} from '../api/catalog.js';

const valid={
  DT_DB_HOST:' 127.0.0.1 ',DT_DB_PORT:'3306',
  DT_DB_NAME:'u345974778_donturron ',
  DT_DB_USER:'catalog_reader',DT_DB_PASSWORD:'hidden-db-secret'
};
function mockResponse(){
  return {
    statusCode:200, headers:{}, body:null,
    setHeader(k,v){this.headers[k]=v;return this;},
    status(status){this.statusCode=status;return this;},
    json(body){this.body=body;return this;}
  };
}
function row(overrides={}){
  return {
    product_id:'reposa-puros-plegable',
    name:'Reposa puros desde MySQL',retail_price:'219.00',publication_status:'listed',launch_month:null,
    category:'reposa-puros',category_label:'Reposa puros',subtitle:'Acabado metálico',
    description:'Descripción nueva procedente de la base.',
    features_json:'["Metal", "Plegable"]',
    images_json:'[{"src":"assets/products/reposa-puros-dos-acabados.webp","label":"Fotografía"}]',
    art:'reposa',badge:'DISPONIBLE',manufacturer_brand:null,sort_order:1,
    sku:'reposa-puros-plegable:plata',variant_key:'plata',variant_label:'Plata',
    on_hand_qty:5,reserved_qty:2,...overrides
  };
}
test('Hostinger DB env trims host and DB name, but preserves passwords',()=>{
  assert.deepEqual(catalogConfig(valid),{
    host:'127.0.0.1',port:3306,database:'u345974778_donturron',
    user:'catalog_reader',password:'hidden-db-secret'
  });
  assert.equal(catalogConfig({...valid,DT_DB_NAME:'u345974778_rauviaplatform'}),null);
  assert.equal(catalogConfig({...valid,DT_DB_PASSWORD:''}),null);
  assert.equal(catalogConfig({...valid,DT_DB_PORT:'not-a-port'}),null);
});
test('missing env returns categorized HTTP 503, no DB calls or secrets',async()=>{
  const handler=createCatalogHandler({env:{},getDb(){throw Error('must not connect')}});
  const res=mockResponse();await handler({method:'GET'},res);
  assert.equal(res.statusCode,503);
  assert.deepEqual(res.body,{error:'catalog_unavailable',reason:'configuration'});
  assert.equal(JSON.stringify(res.body).includes('hidden'),false);
});
test('MySQL data updates public card, price, variant and inventory',async()=>{
  const handler=createCatalogHandler({
    env:valid,getDb(){return {query:async()=>[[row(),row({
      sku:'reposa-puros-plegable:negro',variant_key:'negro',variant_label:'Negro',
      on_hand_qty:1,reserved_qty:0})]]};}
  });
  const res=mockResponse();await handler({method:'GET'},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.source,'don-turron-inventory');
  assert.equal(res.body.products.length,1);
  const p=res.body.products[0];
  assert.equal(p.name,'Reposa puros desde MySQL');
  assert.equal(p.retailPrice.amount,219);
  assert.equal(p.description,'Descripción nueva procedente de la base.');
  assert.deepEqual(p.variants.map(v=>({label:v.label,stock:v.stock})),[
    {label:'Plata',stock:3},{label:'Negro',stock:1}
  ]);
  assert.ok(!JSON.stringify(res.body).includes('hidden-db-secret'));
});
test('catalog can publish fewer than eight products without marking all unavailable',async()=>{
  const handler=createCatalogHandler({
    env:valid,getDb(){return {query:async()=>[[row({sku:'reposa-puros-plegable:default',variant_key:'default'})]]};}
  });
  const res=mockResponse();await handler({method:'GET'},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.products.length,1);
  assert.equal(res.body.products[0].stock,3);
});
test('missing product content is diagnosed safely, without leaking SQL',async()=>{
  const log=[];
  const handler=createCatalogHandler({
    env:valid,getDb(){return {query:async()=>[[row({category:null})]]};},
    logger:{error(...parts){log.push(parts)}}
  });
  const res=mockResponse();await handler({method:'GET'},res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.reason,'catalog_data');
  assert.match(JSON.stringify(log),/CATALOG_DATA/);
});
test('MySQL permissions and missing schema are distinguishable',async()=>{
  for(const [code,expected] of [
    ['ER_ACCESS_DENIED_ERROR','mysql_permissions'],
    ['ER_NO_SUCH_TABLE','mysql_schema'],
    ['ETIMEDOUT','mysql_connection']
  ]){
    const handler=createCatalogHandler({
      env:valid,getDb(){return {query:async()=>{const e=new Error('PRIVATE SQL DATA');e.code=code;throw e;}};},
      logger:{error(){}}
    });
    const res=mockResponse();await handler({method:'GET'},res);
    assert.equal(res.statusCode,503);
    assert.equal(res.body.reason,expected);
    assert.equal(JSON.stringify(res.body).includes('PRIVATE SQL DATA'),false);
  }
});
test('method is GET-only, not a write API',async()=>{
  const handler=createCatalogHandler({env:valid,getDb(){throw Error('must not connect')}});
  const res=mockResponse();await handler({method:'POST'},res);
  assert.equal(res.statusCode,405);
  assert.equal(res.headers.Allow,'GET');
});

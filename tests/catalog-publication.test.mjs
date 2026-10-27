import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPublicCatalog} from '../api/catalog.js';

const rows=[
  ['humidor-viaje-5-puros',649,'listed'],
  ['cenicero-mesa',549,'listed'],
  ['estuche-viaje',299,'listed'],
  ['estuche-kit-viaje',949,'listed'],
  ['reposa-puros-plegable',189,'listed'],
  ['cortador-v-geometrico',null,'coming_soon'],
  ['encendedor-sarike-butano',null,'coming_soon'],
  ['encendedor-honest-punch',null,'coming_soon']
].map(([product_id,price,status],i)=>({
  product_id, name:product_id, retail_price:price, publication_status:status,
  launch_month:status==='coming_soon'?'2027-01':null,
  category:'test', category_label:'Test', subtitle:'Una pieza',
  description:'Descripción de la ficha', features_json:'["Detalle"]',
  images_json:'[{"src":"assets/products/estuche-viaje.webp","label":"Imagen"}]',
  art:'case',badge:'',sort_order:i,
  sku:product_id+'-sku',variant_key:'default',variant_label:'Único',
  on_hand_qty:2,reserved_qty:0
}));

test('8 publicados: los cinco precios y tres lanzamientos se conservan',()=>{
  const catalog=buildPublicCatalog(rows);
  assert.equal(catalog.products.length,8);
  assert.equal(catalog.products.filter(p=>p.retailPrice!==null).length,5);
});
test('un hidden: siete publicados, sin invalidar los otros cuatro precios',()=>{
  const changed=rows.map(r=>r.product_id==='reposa-puros-plegable'
    ?{...r,publication_status:'hidden'}:r);
  // La consulta SQL de producción filtra la fila; la segunda defensa filtra
  // cualquier fila oculta entregada accidentalmente.
  const catalog=buildPublicCatalog(changed);
  assert.equal(catalog.products.length,7);
  assert.ok(!catalog.products.some(p=>p.id==='reposa-puros-plegable'));
  for(const id of ['humidor-viaje-5-puros','cenicero-mesa','estuche-viaje','estuche-kit-viaje']){
    const expected=rows.find(r=>r.product_id===id).retail_price;
    assert.equal(catalog.products.find(p=>p.id===id).retailPrice.amount,expected,id);
  }
  assert.equal(catalog.products.filter(p=>p.launchWindow).length,3);
});
test('ocultar todos genera catálogo vacío válido y no un error general',()=>{
  const result=buildPublicCatalog(rows.map(r=>({...r,publication_status:'hidden'})));
  assert.deepEqual(result.products,[]);
  assert.equal(result.source,'don-turron-inventory');
});
test('sin existencias registradas, el precio de cada artículo es independiente',()=>{
  const changed=rows.filter(r=>r.product_id!=='cenicero-mesa').map(r=>
    r.product_id==='estuche-viaje'?{...r,on_hand_qty:null}:r);
  const result=buildPublicCatalog(changed);
  assert.equal(result.products.length,7);
  const pouch=result.products.find(p=>p.id==='estuche-viaje');
  assert.equal(pouch.stock,null);
  assert.equal(pouch.retailPrice.amount,299);
  assert.equal(result.products.find(p=>p.id==='humidor-viaje-5-puros').retailPrice.amount,649);
});

test('un alta válida en MySQL no depende de la lista inicial de ocho',()=>{
  const newRow={...rows[0],product_id:'accesorio-nuevo',name:'Nueva alta',
    publication_status:'listed',retail_price:'390.00',sku:'accesorio-nuevo:default'};
  const result=buildPublicCatalog([...rows,newRow]);
  assert.equal(result.products.length,9);
  assert.equal(result.products.find(p=>p.id==='accesorio-nuevo').retailPrice.amount,390);
  assert.equal(result.products.find(p=>p.id==='cenicero-mesa').retailPrice.amount,549);
});
test('inventario cero no equivale a producto oculto ni a precio no confirmado',()=>{
  const modified=rows.map(p=>p.product_id==='cenicero-mesa'?{...p,on_hand_qty:0}:p);
  const result=buildPublicCatalog(modified);
  const product=result.products.find(p=>p.id==='cenicero-mesa');
  assert.ok(product);
  assert.equal(product.stock,0);
  assert.equal(product.retailPrice.amount,549);
});

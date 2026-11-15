import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildPublicCatalog} from '../api/catalog.js';
import {reconcileApprovedCatalog} from '../api/catalog-release.js';
import {renderHome,renderProductPage,catalogMarkdown,liveGraph} from '../server/catalog-public.js';

const approved=JSON.parse(fs.readFileSync(new URL('../knowledge/products.json',import.meta.url),'utf8'));
const ids=['cortador-v-geometrico','encendedor-sarike-butano','encendedor-honest-punch'];
const expectedPrices=[479,719,489];
const originalPrice=new Map(approved.map(p=>[p.id,p.retailPrice?.amount??null]));

function legacyRows({stockByKey={},statusById={}}={}){
  const selected=approved.filter(p=>p.id==='cenicero-mesa'||ids.includes(p.id));
  return selected.flatMap(p=>{
    const released=ids.includes(p.id);
    const options=p.variants.length?p.variants:[{label:'Único'}];
    return options.map(v=>{
      const key=p.id+':'+v.label.toLowerCase();
      const stock=Object.hasOwn(stockByKey,key)?stockByKey[key]:null;
      return {
        product_id:p.id,name:p.name,retail_price:released?null:p.retailPrice.amount,
        publication_status:statusById[p.id]||(released?'coming_soon':'listed'),
        launch_month:released?'2027-01':null,
        category:p.category,category_label:p.categoryLabel,subtitle:p.subtitle,
        description:released?'Texto antiguo de la base':p.description,
        features_json:JSON.stringify(p.features),images_json:JSON.stringify(p.images),
        art:p.art,badge:released?'PRÓXIMAMENTE':p.badge,
        sku:key,variant_key:p.variants.length?v.label.toLowerCase():'default',
        variant_label:v.label,on_hand_qty:stock,reserved_qty:0
      };
    });
  });
}
function corrected(options){
  const rows=legacyRows(options);
  const database=buildPublicCatalog(rows);
  return {database:database.products,products:reconcileApprovedCatalog(database.products)};
}

test('Git approved prices survive an obsolete Hostinger MySQL editorial snapshot',()=>{
  const {database,products}=corrected();
  for(let i=0;i<ids.length;i++){
    const old=database.find(p=>p.id===ids[i]);
    const current=products.find(p=>p.id===ids[i]);
    assert.equal(old.retailPrice,null,'The fixture must really be stale');
    assert.equal(old.publicationStatus,'coming_soon');
    assert.equal(current.retailPrice.amount,expectedPrices[i],ids[i]);
    assert.equal(current.retailPrice.taxIncluded,true);
    assert.equal(current.retailPrice.shippingIncluded,false);
    assert.equal(current.launchWindow,null);
    assert.equal(current.publicationStatus,'listed');
    assert.equal(current.commercialStatus,'available');
    assert.equal(current.badge,'DISPONIBLE');
    assert.equal(current.description,approved.find(p=>p.id===ids[i]).description);
    assert.deepEqual(current.images,approved.find(p=>p.id===ids[i]).images);
  }
  const unrelated=products.find(p=>p.id==='cenicero-mesa');
  assert.strictEqual(unrelated,database.find(p=>p.id==='cenicero-mesa'),
    'Unrelated products must remain the very same DB objects');
  assert.equal(unrelated.retailPrice.amount,originalPrice.get(unrelated.id));
  assert.deepEqual(products.map(p=>p.id),database.map(p=>p.id));
});

test('Parike silver is always unselectable; declared finishes do not invent stock',()=>{
  const {products}=corrected();
  const parike=products.find(p=>p.id==='encendedor-sarike-butano');
  assert.deepEqual(parike.variants.map(v=>[v.label,v.status,v.stock]),[
    ['Plata','unavailable',0],['Dorado','available',null]
  ]);
  const cutter=products.find(p=>p.id==='cortador-v-geometrico');
  const honest=products.find(p=>p.id==='encendedor-honest-punch');
  for(const p of [cutter,honest])for(const v of p.variants){
    assert.equal(v.status,'available');
    assert.equal(v.stock,null);
  }
});

test('Real recorded stock zero or positive takes precedence over an availability statement',()=>{
  const {products}=corrected({stockByKey:{
    'encendedor-sarike-butano:plata':4,
    'encendedor-sarike-butano:dorado':0,
    'encendedor-honest-punch:rojo':2,
    'cortador-v-geometrico:plateado':0
  }});
  const parike=products.find(p=>p.id==='encendedor-sarike-butano');
  assert.deepEqual(parike.variants.map(v=>[v.status,v.stock]),[
    ['unavailable',0],['unavailable',0]
  ]);
  assert.deepEqual(products.find(p=>p.id==='encendedor-honest-punch')
    .variants.find(v=>v.label==='Rojo').stock,2);
  assert.equal(products.find(p=>p.id==='cortador-v-geometrico')
    .variants.find(v=>v.label==='Plateado').status,'unavailable');
});

test('Database global sold-out and hidden products remain blocked',()=>{
  const {database,products}=corrected({statusById:{
    'encendedor-honest-punch':'Out of stock'
  }});
  const honest=products.find(p=>p.id==='encendedor-honest-punch');
  assert.equal(honest.publicationStatus,'Out of stock');
  assert.equal(honest.commercialStatus,'unavailable');
  assert.equal(honest.retailPrice.amount,489);
  assert.deepEqual(reconcileApprovedCatalog([]),[]);
  assert.deepEqual(reconcileApprovedCatalog(database.filter(p=>p.id!=='encendedor-sarike-butano'))
    .map(p=>p.id),database.filter(p=>p.id!=='encendedor-sarike-butano').map(p=>p.id));
});

test('Hostinger SSR, product detail and LLMO consistently publish the approved prices',()=>{
  const {products}=corrected();
  const template=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const html=renderHome(template,products);
  const prices={'cortador-v-geometrico':'$479 MXN','encendedor-sarike-butano':'$719 MXN',
    'encendedor-honest-punch':'$489 MXN'};
  for(const [id,value] of Object.entries(prices)){
    const card=html.match(new RegExp('<article class="product-card" data-id="'+id+'">[\\s\\S]*?<\\/article>'))?.[0];
    assert.ok(card,'Missing SSR card: '+id);
    assert.ok(card.includes(value),'Missing SSR price: '+id);
    assert.ok(card.includes('data-variant-product="'+id+'"'),'No SSR variant picker: '+id);
    assert.doesNotMatch(card,/PRÓXIMAMENTE|Precio por confirmar/);
    const product=products.find(p=>p.id===id);
    const detail=renderProductPage(product,products);
    assert.match(detail,new RegExp(value.replace('$','\\$')));
    assert.doesNotMatch(detail,/Disponibilidad prevista: enero de 2027/);
  }
  const parike=html.match(new RegExp('<article class="product-card" data-id="encendedor-sarike-butano">[\\s\\S]*?<\\/article>'))?.[0];
  assert.match(parike,/Plata: SIN EXISTENCIA/);
  assert.match(parike,/<option value="Plata" disabled>/);
  assert.match(parike,/value="Dorado" selected/);
  const md=catalogMarkdown(products);
  assert.match(md,/Plata: SIN EXISTENCIA/);
  const baseline=JSON.parse(fs.readFileSync(new URL('../ai/knowledge-graph.json',import.meta.url),'utf8'));
  const graph=liveGraph(products,baseline);
  assert.equal(graph.nodes.find(n=>n.id==='encendedor-honest-punch').retailPrice.amount,489);
});

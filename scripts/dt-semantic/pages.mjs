import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load,validate } from './validate.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=(p,text)=>{const dest=path.join(ROOT,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,text,'utf8');};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonld=obj=>JSON.stringify(obj).replace(/</g,'\\u003c');
const retailText=p=>p.retailPrice?'$'+p.retailPrice.amount.toLocaleString('es-MX')+' MXN':null;
const hasRecordedStock=p=>p.id==='reposa-puros-plegable' && p.variants.length===2 && p.variants.every(v=>Number.isInteger(v.stock));
const stockText=p=>p.variants.map(v=>v.label+': '+v.stock+' '+(v.stock===1?'disponible':'disponibles')).join(' · ');
const stockCard=p=>!hasRecordedStock(p)?'':`<p class="product-stock">${esc(stockText(p))}</p><div class="variant-picker" data-variant-product="${esc(p.id)}"><label>Color<select data-variant-color aria-label="Color del reposa puros">${p.variants.map(v=>`<option value="${esc(v.label)}">${esc(v.label)}</option>`).join('')}</select></label><label>Cantidad<select data-variant-qty aria-label="Cantidad del reposa puros"><option value="1">1</option><option value="2">2</option></select></label><p class="variant-remaining" data-variant-remaining aria-live="polite"></p></div>`;
function relatedProducts(p,k){
  const visible=k.products.filter(x=>x.id!==p.id&&x.contentStatus==='documented');
  const score=x=>{
    const common=k['use-cases'].filter(u=>u.productIds.includes(p.id)&&u.productIds.includes(x.id)).length;
    return (common*3)+(p.category===x.category?2:0);
  };
  return visible.map(x=>({product:x,score:score(x)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.product.name.localeCompare(b.product.name,'es')).slice(0,3).map(x=>x.product);
}
const frame=(title,body,description,ld)=>`<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#17130f">
<title>${esc(title)} | Don Turrón</title>
<link rel="icon" href="../../favicon.ico" type="image/x-icon">
<link rel="icon" href="../../assets/favicon-32x32.png" type="image/png" sizes="32x32">
<link rel="icon" href="../../assets/favicon-16x16.png" type="image/png" sizes="16x16">
<link rel="icon" href="../../assets/favicon-monogram-black.png" type="image/png" sizes="512x512" media="(prefers-color-scheme: light)">
<link rel="icon" href="../../assets/favicon-monogram-gold.png" type="image/png" sizes="512x512" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="../../assets/apple-touch-icon.png" sizes="180x180">
<link rel="stylesheet" href="../../styles.css">
<style>
.dt-page{background:#f8f5ef;color:#241d15;min-height:100vh;font-family:Manrope,Arial,sans-serif}
.dt-bar{background:#18130f;color:#e6c89e;padding:18px max(22px,calc((100vw - 1140px)/2));display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dt-bar a,.dt-page a{color:inherit}
.dt-logo{font-family:Georgia,serif;letter-spacing:.1em;font-size:21px}
.dt-main{width:min(1120px,calc(100% - 40px));margin:0 auto;padding:44px 0 90px}
.dt-breadcrumb{font-size:12px;color:#796952;margin-bottom:24px}
.dt-breadcrumb a{color:#796952}
.dt-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px}
.dt-kicker{text-transform:uppercase;letter-spacing:.13em;color:#917044;font-size:12px}
.dt-title{font:500 clamp(40px,5vw,65px)/1.03 Georgia,serif;margin:18px 0 26px}
.dt-description{font-size:15px;line-height:1.9;max-width:60ch}
.dt-retail-price{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 16px;margin:0 0 20px;color:#5d4022}.dt-retail-price strong{font:500 32px Georgia,serif}.dt-retail-price span{font-size:12px;color:#746554}.dt-launch{margin:8px 0 25px;padding:12px 15px;border-left:2px solid #b78a56;background:#f0e8dd;color:#6d4b28;font-size:13px;line-height:1.6;font-weight:600}
.dt-features li{line-height:1.7;padding:10px 0;border-bottom:1px solid #d9cfc0;font-size:14px}
.dt-images{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:start}
.dt-images figure{margin:0;min-width:0;background:#231a14;padding:8px}
.dt-images figure:first-child{grid-column:1/-1}
.dt-images img{display:block;width:100%;height:auto;aspect-ratio:1/1;object-fit:contain}
.dt-images figcaption{color:#e4caa5;font-size:11px;line-height:1.5;padding:9px}
.dt-note{margin-top:24px;padding:15px 17px;background:#eae0d3;font-size:13px;line-height:1.7}
.dt-related{margin-top:65px;padding-top:25px;border-top:1px solid #cdbda7}
.dt-related h2{font:500 32px Georgia,serif}
.dt-related ul{line-height:2.3}
.dt-footer{background:#18130f;color:#d6ba90;padding:25px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;text-align:left;font-size:12px}
.dt-credit{display:inline-block;margin-left:auto;color:#baa78e;font-size:11px;text-align:right}
.dt-credit a{color:#e5c38d;text-decoration:underline;text-underline-offset:3px}
.dt-credit a:hover{color:#fff0d6}
:focus-visible{outline:3px solid #b38650;outline-offset:3px}
@media(max-width:760px){.dt-layout{grid-template-columns:1fr}.dt-images{order:-1}.dt-main{padding-top:20px}}
</style>
<script type="application/ld+json">${jsonld(ld)}</script>
</head><body class="dt-page">
<header class="dt-bar"><a class="dt-logo" href="../../index.html">DON TURRÓN</a><span>El arte está en los detalles.</span></header>
${body}
<footer class="dt-footer"><span>Don Turrón · Catálogo en prelanzamiento · Sin compras habilitadas</span><span class="dt-credit">Experiencia digital desarrollada por <a href="https://rauvia.com.mx/" target="_blank" rel="noopener noreferrer" aria-label="RAUVIA Consulting (abre en otra pestaña)"><strong>RAUVIA Consulting</strong></a></span></footer>
</body></html>`;
function productPage(p,k){
  const images=p.images.map((x,i)=>`<figure><img src="../../${esc(x.src)}" alt="${esc(x.label)}" width="620" height="620" decoding="async" loading="${i?'lazy':'eager'}" fetchpriority="${i?'low':'high'}"><figcaption>${esc(x.label)}</figcaption></figure>`).join('');
  const related=relatedProducts(p,k);
  const body=`<main class="dt-main"><nav class="dt-breadcrumb" aria-label="Ruta de navegación"><a href="../../index.html">Inicio</a> / <a href="../../index.html#coleccion">Colección</a> / ${esc(p.name)}</nav>
    <section class="dt-layout"><div><p class="dt-kicker">${esc(p.categoryLabel)} · Artículo documentado</p><h1 class="dt-title">${esc(p.name)}</h1>
    <p class="dt-description">${esc(p.description)}</p>
    ${p.retailPrice?`<p class="dt-retail-price"><strong>${esc(retailText(p))}</strong><span>IVA incluido · Envío no incluido</span></p>`:''}
    ${p.launchWindow?`<p class="dt-launch">${esc(p.launchWindow.label)}</p>`:''}
    <h2>Características descritas</h2><ul class="dt-features">${p.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>
    ${p.variants.length?`<p>${hasRecordedStock(p)?'Inventario registrado por acabado: '+esc(stockText(p))+'. Las unidades no están reservadas.':'Acabados descritos: '+p.variants.map(v=>esc(v.label)).join(' y ')+'. Las existencias por acabado están pendientes.'}</p>`:''}
    <p class="dt-note">${p.launchWindow?'Disponibilidad prevista para enero de 2027. Esta página presenta el producto y todavía no recibe pedidos.':hasRecordedStock(p)?'Precio final al público con IVA incluido; envío por separado. Inventario registrado sujeto a cambios; seleccionar no reserva unidades y este sitio todavía no recibe pedidos.':'Precio final al público con IVA incluido; el envío se calcula por separado. Existencias por confirmar. Esta página informa sobre el producto; todavía no recibe pedidos.'}</p></div>
    <div class="dt-images" aria-label="Fotografías del producto">${images}</div></section>
    <section class="dt-related"><h2>También puedes conocer</h2><ul>${related.map(x=>`<li><a href="../${esc(x.id)}/">${esc(x.name)}</a></li>`).join('')||'<li><a href="../../index.html#coleccion">Explorar la colección</a></li>'}</ul><p><a href="../../index.html#coleccion">Volver a la colección</a> · <a href="../../guia/estuche-o-humidor/">Estuche o humidor: qué cambia</a></p></section>
  </main>`;
  const ld={'@context':'https://schema.org','@graph':[
   {'@type':'Product','@id':'#product',name:p.name,description:p.description+(p.launchWindow?' '+p.launchWindow.label+'.':''),image:p.images.map(x=>'../../'+x.src),category:p.categoryLabel,brand:{'@type':'Brand',name:p.manufacturerBrand||'Don Turrón'},...(p.retailPrice?{additionalProperty:[{'@type':'PropertyValue',name:'Precio público informativo (IVA incluido, envío no incluido)',value:retailText(p)}]}:{})},
   {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Inicio',item:'../../index.html'},{'@type':'ListItem',position:2,name:'Colección',item:'../../index.html#coleccion'},{'@type':'ListItem',position:3,name:p.name}]}
  ]};
  return frame(p.name,body,p.description.slice(0,170),ld);
}
function guidePage(k){
  const answer=k['canonical-answers'].find(x=>x.id==='answer:humidor-estuche');
  const pids=['humidor-viaje-5-puros','estuche-viaje','estuche-kit-viaje'];
  const body=`<main class="dt-main"><nav class="dt-breadcrumb"><a href="../../index.html">Inicio</a> / Guías</nav><p class="dt-kicker">Guía de nuestra primera colección</p><h1 class="dt-title">¿Estuche o humidor de viaje?</h1><p class="dt-description">${esc(answer.answer)}</p><p class="dt-note">No se afirman resultados de conservación ni humedad controlada sin ensayos. Las características se basan en las fichas documentadas de los productos.</p><section class="dt-related"><h2>Fichas relacionadas</h2><ul>${pids.map(id=>{const p=k.products.find(x=>x.id===id);return `<li><a href="../../productos/${esc(id)}/">${esc(p.name)}</a></li>`;}).join('')}</ul></section></main>`;
  return frame('Estuche o humidor de viaje',body,answer.answer.slice(0,170),{'@context':'https://schema.org','@type':'WebPage',name:'¿Estuche o humidor de viaje?',description:answer.answer});
}
function prerenderHome(k){
  const cards=k.products.map(p=>{
    const img=p.images.length?`<img class="travel-photo travel-photo-card" data-product-id="${esc(p.id)}" src="${esc(p.images[0].src)}" alt="Fotografía de ${esc(p.name)}; ${esc(p.images[0].label)}" loading="lazy" decoding="async" fetchpriority="low" width="620" height="620">`:`<img src="assets/${esc(p.art)}.svg" alt="Ilustración conceptual de ${esc(p.name)}" loading="lazy">`;
    return `<article class="product-card" data-id="${esc(p.id)}"><div class="product-art art-${esc(p.art)}">${p.badge?`<span class="product-badge">${esc(p.badge)}</span>`:''}<button type="button" class="product-image-trigger" data-open-photo="${esc(p.id)}" aria-label="Ver detalles de ${esc(p.name)}">${img}</button><button type="button" class="product-quick" data-detail="${esc(p.id)}" aria-label="Ver detalles de ${esc(p.name)}">↗</button></div><div class="product-details"><div class="product-category">${esc(p.categoryLabel.toUpperCase())}</div><h3>${esc(p.name)}</h3><p class="product-subtitle">${esc(p.subtitle)}</p>${stockCard(p)}${p.launchWindow?`<p class="product-availability">${esc(p.launchWindow.label)}</p>`:''}<div class="product-buy">${p.retailPrice?`<span class="product-price product-price-set"><strong>${esc(retailText(p))}</strong><small>IVA incluido</small></span>`:`<span class="product-price">Precio por confirmar</span>`}<button type="button" class="add-product" data-add="${esc(p.id)}">Seleccionar <span>＋</span></button></div></div></article>`;
  }).join('\n');
  let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const block='<div class="product-grid" id="product-grid"><!-- DT-CATALOG-START -->\n'+cards+'\n<!-- DT-CATALOG-END --></div>';
  if(html.includes('<!-- DT-CATALOG-START -->'))html=html.replace(/<div class="product-grid" id="product-grid"><!-- DT-CATALOG-START -->[\s\S]*?<!-- DT-CATALOG-END --><\/div>/,block);
  else if(html.includes('<div class="product-grid" id="product-grid"></div>'))html=html.replace('<div class="product-grid" id="product-grid"></div>',block);
  else throw new Error('Could not locate home catalog mount');
  out('index.html',html);
}
export function generatePages(){
  const k=load();validate(k);
  const docs=k.products.filter(p=>p.contentStatus==='documented'&&p.visibility!=='internal');
  for(const p of docs)out('productos/'+p.id+'/index.html',productPage(p,k));
  if(fs.existsSync(path.join(ROOT,'productos/encendedor-jet/index.html')))throw new Error('Conceptual encendedor page cannot exist');
  out('guia/estuche-o-humidor/index.html',guidePage(k));
  prerenderHome(k);
  console.log('DT-SC-003: '+docs.length+' product pages, 1 guide, homepage prerender');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))generatePages();

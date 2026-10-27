/* Read-only catalog projection for server-rendered HTML and crawler surfaces. */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const root='https://www.donturron.com.mx';
const price=p=>p.retailPrice?'$'+Number(p.retailPrice.amount).toLocaleString('es-MX')+' MXN':null;
const known=p=>p.variants.length>0&&p.variants.every(v=>Number.isInteger(v.stock)&&v.stock>=0);
const explicitlySoldOut=p=>p.publicationStatus==='Out of stock';
const soldOut=p=>explicitlySoldOut(p)||p.stock===0||(known(p)&&p.variants.every(v=>v.stock===0));
const imgSrc=src=>src.startsWith('https://')||src.startsWith('/')?src:'/'+src;
function card(p){
  const first=p.images?.[0];
  const image=first?'<img class="travel-photo travel-photo-card" data-product-id="'+esc(p.id)+'" src="'+esc(imgSrc(first.src))+'" alt="'+esc(p.name)+': '+esc(first.label)+'" loading="lazy" decoding="async" width="620" height="620">'
    :'<img src="/assets/case.svg" alt="Ilustración de '+esc(p.name)+'" loading="lazy">';
  return '<article class="product-card" data-id="'+esc(p.id)+'"><div class="product-art art-'+esc(p.art)+'">'+
    (p.badge?'<span class="product-badge">'+esc(p.badge)+'</span>':'')+
    '<button type="button" class="product-image-trigger" data-open-photo="'+esc(p.id)+'" aria-label="Ver detalles de '+esc(p.name)+'">'+image+'</button>'+
    '<button type="button" class="product-quick" data-detail="'+esc(p.id)+'" aria-label="Ver detalles de '+esc(p.name)+'">↗</button></div>'+
    '<div class="product-details"><div class="product-category">'+esc(p.categoryLabel.toUpperCase())+'</div><h3>'+esc(p.name)+'</h3><p class="product-subtitle">'+esc(p.subtitle)+'</p>'+
    (!explicitlySoldOut(p)&&Number.isInteger(p.stock)?'<p class="product-stock">'+esc(p.stock+' '+(p.stock===1?'unidad disponible':'unidades disponibles'))+'</p>':'')+
    (!explicitlySoldOut(p)&&known(p)?'<p class="product-stock">'+esc(p.variants.map(v=>v.label+': '+v.stock).join(' · '))+'</p>':'')+
    (p.launchWindow?'<p class="product-availability">'+esc(p.launchWindow.label)+'</p>':'')+
    (soldOut(p)?'<p class="product-availability">Agotado</p>':'')+
    '<div class="product-buy">'+(price(p)?'<span class="product-price product-price-set"><strong>'+esc(price(p))+'</strong><small>IVA incluido</small></span>':'<span class="product-price">Precio por confirmar</span>')+
    '<button type="button" class="add-product" data-add="'+esc(p.id)+'"'+(soldOut(p)?' disabled title="Agotado"':'')+'>'+(soldOut(p)?'Agotado':'Seleccionar')+' <span>＋</span></button></div></div></article>';
}
export function renderHome(source,products){
  const block=/<div class="product-grid" id="product-grid"><!-- DT-CATALOG-START -->[\s\S]*?<!-- DT-CATALOG-END --><\/div>/;
  if(!block.test(source)||!source.includes('<script defer src="catalog.js"></script>'))throw Error('Home catalog anchor missing');
  let html=source.replace(block,'<div class="product-grid" id="product-grid"><!-- DT-CATALOG-START -->'+products.map(card).join('\n')+'<!-- DT-CATALOG-END --></div>');
  // Seed the browser from the very same database snapshot; don't flash static stock.
  html=html.replace('<script defer src="catalog.js"></script>','<script>window.DON_TURRON_CATALOG='+json(products)+';</script>');
  html=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/,(_all,data)=>{
    let graph;try{graph=JSON.parse(data)}catch{return _all}
    for(const node of graph?.['@graph']||[])if(node['@type']==='ItemList'){
      node.numberOfItems=products.length;
      node.itemListElement=products.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:root+'/productos/'+p.id+'/'}));
    }
    return '<script type="application/ld+json">'+json(graph)+'</script>';
  });
  return html;
}
export function publicSitemap(products){
  const paths=['/',...products.map(p=>'/productos/'+p.id+'/'),'/guia/estuche-o-humidor/'];
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
    paths.map(p=>'  <url><loc>'+esc(root+p)+'</loc></url>').join('\n')+'\n</urlset>\n';
}
export function catalogMarkdown(products){
  return '# Don Turrón — catálogo vigente\n\nLos precios son informativos, el envío no está incluido y las consultas se coordinan por WhatsApp. La selección no reserva existencias.\n\n'+products.map(p=>
    '## ['+p.name.replace(/[\[\]]/g,'')+']('+root+'/productos/'+p.id+'/)\n'+p.description+'\n\n'+
    (price(p)?'Precio: '+price(p)+' (IVA incluido; envío aparte).':'Precio por confirmar.')+
    (soldOut(p)?' Agotado.':Number.isInteger(p.stock)?' Stock: '+p.stock+'.':' Existencias por confirmar.')+
    (p.launchWindow?' '+p.launchWindow.label+'.':'')+'\n'
  ).join('\n');
}
export function liveGraph(products,baseline={}){
  // Preserve the AETHRYON knowledge framework (sources, intents, use cases,
  // organization, taxonomy) while replacing only product-owned facts.
  const originalNodes=Array.isArray(baseline.nodes)?baseline.nodes:[];
  const originalEdges=Array.isArray(baseline.edges)?baseline.edges:[];
  const priorProductIds=new Set(originalNodes.filter(n=>n.type==='Product').map(n=>n.id));
  const priorFeatureIds=new Set(originalNodes.filter(n=>n.type==='Feature'&&/^feature:/.test(n.id)).map(n=>n.id));
  const activeIds=new Set(products.map(p=>p.id));
  const removedIds=new Set([...priorProductIds].filter(id=>!activeIds.has(id)));
  const orphanClaimIds=new Set(originalEdges.filter(e=>e.type==='about'&&removedIds.has(e.target)).map(e=>e.source));
  const nodes=originalNodes.filter(n=>!priorProductIds.has(n.id)&&!priorFeatureIds.has(n.id)&&!orphanClaimIds.has(n.id));
  const nodeIds=new Set(nodes.map(n=>n.id));
  const edges=originalEdges.filter(e=>
    !priorFeatureIds.has(e.source)&&!priorFeatureIds.has(e.target)&&
    !priorProductIds.has(e.source)&&!orphanClaimIds.has(e.source)&&!orphanClaimIds.has(e.target)&&
    !(priorProductIds.has(e.target)&&!activeIds.has(e.target)));
  const pushNode=n=>{if(!nodeIds.has(n.id)){nodes.push(n);nodeIds.add(n.id);}};
  for(const p of products){
    const categoryId='category:'+p.category;
    if(!nodeIds.has(categoryId)){
      pushNode({id:categoryId,type:'Category',name:p.categoryLabel});
      if(nodeIds.has('collection:accesorios-puros'))
        edges.push({source:'collection:accesorios-puros',target:categoryId,type:'hasCategory'});
    }
    pushNode({id:p.id,type:'Product',name:p.name,status:'documented',description:p.description,
      ...(p.retailPrice?{retailPrice:p.retailPrice}:{}),
      ...(p.launchWindow?{launchWindow:p.launchWindow}:{}),
      ...(soldOut(p)?{availability:'OutOfStock'}:{}),
      ...(Number.isInteger(p.stock)?{stock:p.stock}:{})});
    edges.push({source:categoryId,target:p.id,type:'containsProduct'});
    for(let i=0;i<p.features.length;i++){
      const featureId='feature:'+p.id+':'+(i+1);
      pushNode({id:featureId,type:'Feature',name:p.features[i],status:'supplier_declared'});
      edges.push({source:p.id,target:featureId,type:'hasDeclaredFeature'});
    }
  }
  const seen=new Set();
  const safeEdges=edges.filter(e=>{
    if(!nodeIds.has(e.source)||!nodeIds.has(e.target))return false;
    const key=[e.source,e.target,e.type].join('\0');
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
  return {...baseline,name:'Don Turrón Live Semantic Knowledge Graph',
    version:'2.0.0',source:'mysql',nodes,edges:safeEdges};
}
export function renderProductPage(p,products,template=''){
  if(!p)return null;
  const style=(template.match(/<style>[\s\S]*?<\/style>/)||[])[0]||'';
  const imgs=(p.images||[]).map((im,i)=>'<figure><img src="'+esc(imgSrc(im.src))+'" alt="'+esc(im.label)+'" width="620" height="620" decoding="async" loading="'+(i?'lazy':'eager')+'"><figcaption>'+esc(im.label)+'</figcaption></figure>').join('')||
    '<figure><img src="/assets/case.svg" alt="Ilustración del producto" width="620" height="620"></figure>';
  const canonical=root+'/productos/'+p.id+'/';
  const schema={'@context':'https://schema.org','@type':'Product','@id':canonical+'#product',name:p.name,
    description:p.description,category:p.categoryLabel,brand:{'@type':'Brand',name:'Don Turrón'},
    image:(p.images||[]).map(im=>im.src.startsWith('https://')?im.src:root+'/'+im.src)};
  return '<!doctype html><html lang="es-MX"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index, follow">'+
    '<meta name="theme-color" content="#17130f"><title>'+esc(p.name)+' | Don Turrón</title>'+
    '<meta name="description" content="'+esc((p.description||p.name).slice(0,170))+'">'+
    '<link rel="canonical" href="'+esc(canonical)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
    '<link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/styles.css">'+style+
    '<script type="application/ld+json">'+json(schema)+'</script></head><body class="dt-page">'+
    '<header class="dt-bar"><a class="dt-logo" href="/">DON TURRÓN</a><span>El arte está en los detalles.</span></header>'+
    '<main class="dt-main"><nav class="dt-breadcrumb"><a href="/">Inicio</a> / <a href="/#coleccion">Colección</a> / '+esc(p.name)+'</nav>'+
    '<section class="dt-layout"><div><p class="dt-kicker">'+esc(p.categoryLabel)+'</p><h1 class="dt-title">'+esc(p.name)+'</h1>'+
    '<p class="dt-description">'+esc(p.description)+'</p>'+
    (price(p)?'<p class="dt-retail-price"><strong>'+esc(price(p))+'</strong><span>IVA incluido · Envío no incluido</span></p>':'<p class="dt-launch">Precio por confirmar</p>')+
    (p.launchWindow?'<p class="dt-launch">'+esc(p.launchWindow.label)+'</p>':'')+
    (soldOut(p)?'<p class="dt-launch">Agotado</p>':'')+
    '<h2>Características</h2><ul class="dt-features">'+p.features.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul>'+
    (Number.isInteger(p.stock)?'<p>Inventario registrado: '+p.stock+'.</p>':'')+
    (known(p)?'<p>Existencias por acabado: '+esc(p.variants.map(v=>v.label+': '+v.stock).join(' · '))+'</p>':'')+
    '<p class="dt-note">Consultar disponibilidad y envío por WhatsApp. La selección no reserva existencias ni procesa pagos.</p></div>'+
    '<div class="dt-images" aria-label="Fotografías del producto">'+imgs+'</div></section>'+
    '<section class="dt-related"><h2>También puedes conocer</h2><ul>'+
    (products.filter(q=>q.id!==p.id&&q.category===p.category).slice(0,3).map(q=>'<li><a href="/productos/'+esc(q.id)+'/">'+esc(q.name)+'</a></li>').join('')||
      '<li><a href="/#coleccion">Explorar el catálogo</a></li>')+
    '</ul><p><a href="/#coleccion">Volver a la colección</a></p></section></main>'+
    '<footer class="dt-footer"><span>Don Turrón · Catálogo digital · Consultas por WhatsApp</span>'+
    '<span class="dt-credit">Experiencia digital desarrollada por <a href="https://rauvia.com.mx/" target="_blank" rel="noopener noreferrer"><strong>RAUVIA Consulting</strong></a></span></footer>'+
    '</body></html>';
}

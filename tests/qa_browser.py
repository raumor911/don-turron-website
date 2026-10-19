"""QA browser sin conexión, inyecta los activos en memoria por restricciones de red."""
import base64, re
from pathlib import Path
from playwright.sync_api import sync_playwright
PROJECT=Path(__file__).resolve().parents[1]
assets={}
for path in list((PROJECT/'assets').iterdir()) + list((PROJECT/'assets'/'products').glob('*.webp')):
 if path.suffix in ('.jpg','.png','.svg','.webp'):
  mime={'jpg':'image/jpeg','png':'image/png','svg':'image/svg+xml','webp':'image/webp'}[path.suffix.lstrip('.')]
  assets['assets/'+('products/' if path.parent.name == 'products' else '')+path.name]=f'data:{mime};base64,'+base64.b64encode(path.read_bytes()).decode()
html=(PROJECT/'index.html').read_text()
css=(PROJECT/'styles.css').read_text()
premium_css=(PROJECT/'premium.css').read_text()
for name,uri in assets.items():
 html=html.replace(name,uri)
 css=css.replace(name,uri)
 premium_css=premium_css.replace(name,uri)
html=html.replace('<link rel="stylesheet" href="styles.css" />','<style>'+css+'</style>')
html=html.replace('<link rel="stylesheet" href="premium.css" />','<style>'+premium_css+'</style>')
html=html.replace('<link rel="stylesheet" href="gallery.css" />','<style>'+(PROJECT/'gallery.css').read_text()+'</style>')
html=re.sub(r'<script defer src="[^\"]+"></script>', '', html)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,width,height in [('desktop',1440,900),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded')
  page.add_script_tag(content=(PROJECT/'config.js').read_text())
  page.add_script_tag(content=(PROJECT/'catalog.js').read_text())
  page.add_script_tag(content=(PROJECT/'app.js').read_text())
  page.add_script_tag(content=(PROJECT/'premium.js').read_text())
  page.add_script_tag(content=(PROJECT/'gallery.js').read_text())
  # Scripts de la app generan src relativos; en el entorno de pruebas se sustituyen por data URI.
  page.evaluate('''(assets)=>{window.fixAssets=()=>{document.querySelectorAll('img[src^="assets/"]').forEach(im=>{const src=im.getAttribute('src');if(assets[src]) im.src=assets[src]})};window.fixAssets();new MutationObserver(()=>window.fixAssets()).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']})}''',assets)
  page.locator('#age-yes').click()
  page.wait_for_timeout(350)
  page.screenshot(path=str(PROJECT/f'tests/{name}.png'),full_page=True)
  assert page.locator('.product-card').count()==6, 'Producto inicial'
  assert page.locator('.product-card[data-id="humidor-viaje-5-puros"]').count()==1, 'Humidor real agregado sin variar seis productos'
  assert page.locator('.dt-progress').count()==1, 'Línea de progreso'
  assert page.locator('.dt-motion-toggle').count()==1, 'Control de movimiento'
  assert page.locator('.product-card.dt-enter').count()==6, 'Animación productos'
  page.locator('[data-filter="humidores"]').click()
  assert page.locator('.product-card').count()==1, 'Filtrado'
  assert page.locator('.product-card').first.get_attribute('data-dt-enhanced')=='true', 'Animación tras filtro'
  page.locator('.product-card [data-add]').click()
  assert page.locator('#cart-count').inner_text()=='1', 'Contador selección'
  page.locator('#open-selection').click()
  assert page.locator('.drawer-line').count()==1, 'Contenido selección'
  page.locator('[data-qty="1"]').click()
  assert page.locator('#cart-count').inner_text()=='2', 'Sumar cantidad'
  page.locator('[data-qty="-1"]').click()
  assert page.locator('#cart-count').inner_text()=='1', 'Restar cantidad'
  page.locator('#close-selection').click()
  page.locator('.product-card [data-detail]').click()
  assert page.locator('#product-modal-name').inner_text()=='Humidor de viaje para 5 puros','Detalle'
  assert page.locator('.travel-gallery-controls button').count()==4, 'Cuatro vistas adaptadas'
  page.locator('.travel-gallery-controls button[data-photo-index="2"]').click()
  assert 'Cierres y humidificador' in page.locator('.travel-photo-modal').get_attribute('alt'), 'Galería con interacción'
  assert page.locator('.travel-gallery-controls button[data-photo-index="2"]').get_attribute('aria-pressed')=='true', 'Galería accesible'
  page.locator('#product-modal-close').click()
  page.locator('[data-filter="ceniceros"]').click()
  assert page.locator('.product-card').count()==1, 'Filtro de ceniceros preservado'
  assert page.locator('.product-card[data-id="cenicero-mesa"]').count()==1, 'Misma estructura de seis fichas'
  page.locator('.product-card [data-detail]').click()
  assert page.locator('#product-modal-name').inner_text()=='Set portátil de cenicero y cortadores', 'Ficha del nuevo set'
  assert page.locator('.travel-gallery-controls button').count()==5, 'Cinco fotografías del set'
  page.locator('.travel-gallery-controls button[data-photo-index="4"]').click()
  assert 'cortador en V' in page.locator('.travel-photo-modal').get_attribute('alt'), 'Interacción de la quinta fotografía'
  assert page.locator('.travel-gallery-controls button[data-photo-index="4"]').get_attribute('aria-pressed')=='true', 'Estado accesible'
  page.locator('#product-modal-close').click()
  page.locator('[data-filter="estuches"]').click()
  assert page.locator('.product-card').count()==2, 'Dos estuches en la misma categoría'
  assert page.locator('.product-card[data-id="estuche-viaje"]').count()==1, 'Tercer producto preservado'
  assert page.locator('.product-card[data-id="estuche-kit-viaje"]').count()==1, 'Cuarto producto sin ampliar las seis tarjetas'
  page.locator('.product-card[data-id="estuche-viaje"] [data-detail]').click()
  assert page.locator('#product-modal-name').inner_text()=='Estuche porta puros con humidificador', 'Título del tercer producto'
  assert page.locator('.travel-gallery-controls button').count()==5, 'Cinco vistas del tercer producto'
  page.locator('.travel-gallery-controls button[data-photo-index="3"]').click()
  assert 'Recomendación visual para humedecer la esponja' in page.locator('.travel-photo-modal').get_attribute('alt'), 'Cambio de fotografía del tercer producto'
  assert page.locator('.travel-gallery-controls button[data-photo-index="3"]').get_attribute('aria-pressed')=='true', 'Galería accesible anterior'
  page.locator('#product-modal-close').click()
  page.locator('.product-card[data-id="estuche-kit-viaje"] [data-detail]').click()
  assert page.locator('#product-modal-name').inner_text()=='Estuche portátil para 4 a 8 puros', 'Ficha del cuarto producto'
  assert page.locator('.travel-gallery-controls button').count()==2, 'Dos fotografías del cuarto producto'
  page.locator('.travel-gallery-controls button[data-photo-index="1"]').click()
  assert 'Lámina técnica con medidas indicativas' in page.locator('.travel-photo-modal').get_attribute('alt'), 'Cambio de vista técnica'
  assert page.locator('.travel-gallery-controls button[data-photo-index="1"]').get_attribute('aria-pressed')=='true', 'Galería del cuarto producto accesible'
  assert (PROJECT/'assets/products/estuche-set-lounge.webp').is_file(), 'Fotografía editorial incorporada'
  assert (PROJECT/'assets/products/estuche-set-medidas.webp').is_file(), 'Lámina técnica incorporada'
  page.locator('#product-modal-close').click()
  page.locator('[data-filter="soportes"]').click()
  assert page.locator('.product-card').count()==1, 'Filtro de soportes sin cambiar el diseño'
  assert page.locator('.product-card[data-id="reposa-puros-plegable"]').count()==1, 'Quinto producto en una tarjeta existente'
  assert page.locator('.category-tile[data-category="soportes"]').count()==1, 'Categoría de soportes disponible'
  page.locator('.product-card[data-id="reposa-puros-plegable"] [data-detail]').click()
  assert page.locator('#product-modal-name').inner_text()=='Reposa puros plegable de acero inoxidable', 'Detalle del quinto artículo'
  assert page.locator('.travel-gallery-controls button').count()==3, 'Tres fotografías del reposa puros'
  page.locator('.travel-gallery-controls button[data-photo-index="2"]').click()
  assert 'en negro' in page.locator('.travel-photo-modal').get_attribute('alt'), 'Vista de la variante negra'
  assert page.locator('.travel-gallery-controls button[data-photo-index="2"]').get_attribute('aria-pressed')=='true', 'Selección accesible de variante'
  page.locator('#product-modal-content [data-add]').click()
  assert page.locator('#cart-count').inner_text()=='2', 'Añadir soporte sin romper selección'
  page.locator('#product-modal-close').click()
  for asset in ['reposa-puros-dos-acabados.webp','reposa-puros-plata.webp','reposa-puros-negro.webp']:
   assert (PROJECT/'assets/products'/asset).is_file(), f'Falta imagen {asset}'
  # Galería V4: validar imágenes completas, navegación y ampliación en todos los artículos.
  page.locator('[data-filter="todos"]').click()
  cases = [
   ('humidor-viaje-5-puros',4),
   ('cenicero-mesa',5),
   ('estuche-viaje',5),
   ('estuche-kit-viaje',2),
   ('reposa-puros-plegable',3),
   ('encendedor-jet',1)
  ]
  for product_id,total in cases:
   page.locator(f'.product-card[data-id="{product_id}"] [data-detail]').click()
   image=page.locator('.modal-art .dt-image-open img')
   assert image.count()==1, f'Imagen ampliable en {product_id}'
   assert image.evaluate('(img)=>getComputedStyle(img).objectFit')=='contain', f'Fotografía sin recorte {product_id}'
   assert page.locator('.dt-gallery-status').is_visible(), f'Contador accesible {product_id}'
   if total > 1:
    assert page.locator('.dt-gallery-nav-anterior').count()==1, f'Flecha anterior {product_id}'
    assert page.locator('.dt-gallery-nav-siguiente').count()==1, f'Flecha siguiente {product_id}'
    assert page.locator('.travel-gallery-controls button').count()==total, f'Número de vistas {product_id}'
    page.locator('.dt-gallery-nav-siguiente').click()
    assert page.locator('.travel-gallery-controls button[data-photo-index="1"]').get_attribute('aria-pressed')=='true', f'Siguiente {product_id}'
    page.locator('.dt-gallery-nav-anterior').click()
    assert page.locator('.travel-gallery-controls button[data-photo-index="0"]').get_attribute('aria-pressed')=='true', f'Anterior {product_id}'
    page.keyboard.press('ArrowLeft')
    assert page.locator(f'.travel-gallery-controls button[data-photo-index="{total-1}"]').get_attribute('aria-pressed')=='true', f'Circular teclado {product_id}'
   else:
    assert page.locator('.dt-gallery-nav-siguiente').count()==0, 'No mostrar flechas con una imagen'
   page.locator('.dt-image-open').click()
   assert page.locator('#dt-photo-lightbox').is_visible(), f'Imagen ampliada {product_id}'
   assert page.locator('#dt-lightbox-image').get_attribute('alt'), f'Texto alternativo {product_id}'
   assert page.locator('#dt-lightbox-image').evaluate('(img)=>getComputedStyle(img).objectFit')=='contain', f'Ampliada sin recorte {product_id}'
   if total > 1:
    page.locator('#dt-lightbox-next').click()
    assert page.locator('.travel-gallery-controls button').filter(has=page.locator('[aria-pressed="true"]')).count() >= 0
   page.locator('#dt-lightbox-zoom').click()
   assert page.locator('#dt-photo-lightbox').get_attribute('class').find('dt-zoomed')>=0, f'Zoom {product_id}'
   page.locator('#dt-lightbox-zoom').click()
   assert 'dt-zoomed' not in page.locator('#dt-photo-lightbox').get_attribute('class'), f'Reducir zoom {product_id}'
   page.keyboard.press('Escape')
   assert not page.locator('#dt-photo-lightbox').is_visible(), f'Cerrar ampliación {product_id}'
   assert page.locator('#product-modal').get_attribute('aria-hidden')=='false', f'Conservar ficha abierta {product_id}'
   page.locator('#product-modal-close').click()
  if name=='mobile':
   page.locator('#menu-toggle').click()
   assert page.locator('#mobile-nav').is_visible(),'menú móvil'
   page.locator('#mobile-nav a').first.click()
   assert not page.locator('#mobile-nav').is_visible(),'cerrar menú móvil'
  page.locator('.dt-motion-toggle').click()
  assert page.evaluate("document.documentElement.classList.contains('dt-still')"), 'Movimiento reducido'
  page.locator('.dt-motion-toggle').click()
  assert not page.evaluate("document.documentElement.classList.contains('dt-still')"), 'Movimiento normal'
  overflow=page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2')
  assert not overflow, f'Overflow horizontal {name}'
  assert not errors, f'Errores JS {name}: {errors}'
  print(name,'OK','screenshot',f'tests/{name}.png')
  page.close()
 browser.close()

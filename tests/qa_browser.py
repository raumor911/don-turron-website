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
 for name,width,height in [('desktop',1440,900),('iphone',390,844),('galaxy',412,915),('compact',360,780)]:
  touch=name!='desktop'
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=(2 if touch else 1),is_mobile=touch,has_touch=touch)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded')
  page.evaluate("document.querySelector('.product-card').dataset.prerenderMarker='original'")
  page.add_script_tag(content=(PROJECT/'config.js').read_text())
  page.add_script_tag(content=(PROJECT/'catalog.js').read_text())
  page.add_script_tag(content=(PROJECT/'app.js').read_text())
  page.add_script_tag(content=(PROJECT/'premium.js').read_text())
  page.add_script_tag(content=(PROJECT/'gallery.js').read_text())
  page.evaluate("window.__dtEvents=[];window.addEventListener('dt:interaction',e=>window.__dtEvents.push(e.detail))")
  page.add_script_tag(content=(PROJECT/'telemetry-client.js').read_text())
  # Scripts de la app generan src relativos; en el entorno de pruebas se sustituyen por data URI.
  page.evaluate('''(assets)=>{window.fixAssets=()=>{document.querySelectorAll('img[src^="assets/"]').forEach(im=>{const src=im.getAttribute('src');if(assets[src]) im.src=assets[src]})};window.fixAssets();new MutationObserver(()=>window.fixAssets()).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']})}''',assets)
  page.locator('#age-yes').click()
  page.wait_for_timeout(350)
  page.screenshot(path=str(PROJECT/f'tests/{name}.png'),full_page=True)
  assert page.locator('.product-card').count()==7, 'Siete productos con respaldo documental'
  assert page.locator('.product-card').first.get_attribute('data-prerender-marker')=='original', 'Conservar DOM prerenderizado sin repintar al cargar'
  assert page.locator('.product-card[data-id="encendedor-jet"]').count()==0, 'Sin referencia de encendedor inexistente'
  assert page.locator('.product-card .product-badge').filter(has_text='PRÓXIMAMENTE').count()==2, 'Exclusivamente dos etiquetas Próximamente'
  assert page.locator('.product-card .product-availability').count()==2, 'Solo dos lanzamientos con mes definido'
  assert page.locator('.product-card .product-image-trigger').count()==7, 'Imagen clicable en las siete tarjetas'

  price_examples={'humidor-viaje-5-puros':649,'cenicero-mesa':549,'estuche-viaje':299,'estuche-kit-viaje':949,'reposa-puros-plegable':189}
  for product_id,amount in price_examples.items():
   card=page.locator(f'.product-card[data-id="{product_id}"]')
   assert f'${amount} MXN' in card.locator('.product-price').inner_text(),product_id
   assert 'IVA incluido' in card.locator('.product-price').inner_text(),product_id
  for product_id in ('cortador-v-geometrico','encendedor-sarike-butano'):
   assert page.locator(f'.product-card[data-id="{product_id}"] .product-price').inner_text()=='Precio por confirmar',product_id

  page.locator('.product-card[data-id="humidor-viaje-5-puros"] .product-image-trigger').focus()
  page.keyboard.press('Enter')
  assert page.locator('#product-modal-name').inner_text()=='Humidor de viaje para 5 puros', 'Abrir detalle de la foto con teclado'
  assert page.evaluate("window.__dtEvents.some(e=>e.event==='product_view'&&e.product_id==='humidor-viaje-5-puros')"), 'Telemetry product view on actual open'
  page.locator('#product-modal-close').click()
  assert page.locator('.product-card[data-id="humidor-viaje-5-puros"]').count()==1, 'Humidor real agregado sin modificar la estructura de las tarjetas'
  assert page.locator('.dt-progress').count()==1, 'Línea de progreso'
  assert page.locator('.dt-motion-toggle').count()==0, 'No se muestra control de movimiento'
  assert page.locator('#dt-edge-bronze').count()==1, 'Filtro tonal sobre emblema de esencia'
  assert page.locator('.philosophy-frame img').evaluate("el => getComputedStyle(el).filter.includes('dt-edge-bronze')"), 'Emblema aplica filtro café claro'
  assert page.locator('.product-card.dt-enter').count()==7, 'Animación de siete productos'
  page.locator('[data-filter="encendedores"]').click()
  assert page.locator('.product-card').count()==1, 'Solo el encendedor Sarike tiene ficha verificada documentalmente'
  assert page.locator('.product-card[data-id="encendedor-sarike-butano"]').count()==1, 'Tarjeta Sarike añadida'
  assert page.locator('.product-card[data-id="encendedor-sarike-butano"] .product-badge').inner_text()=='PRÓXIMAMENTE', 'Encendedor Sarike: nueva etiqueta'
  assert page.locator('.product-card[data-id="encendedor-sarike-butano"] .product-availability').inner_text()=='Disponibilidad prevista: enero de 2027', 'Encendedor Sarike: mes previsto'
  assert 'Flama suave y jet' in page.locator('.product-card[data-id="encendedor-sarike-butano"] .product-subtitle').inner_text(), 'Sarike reúne ambos tipos de flama'
  page.locator('.product-card[data-id="encendedor-sarike-butano"] .product-image-trigger').click()
  assert page.locator('#product-modal-name').inner_text()=='Encendedor metálico Sarike de doble llama', 'Ficha Sarike'
  assert page.locator('.modal-availability').inner_text()=='Disponibilidad prevista: enero de 2027', 'Encendedor Sarike: fecha en modal'
  assert page.locator('.modal-retail-price').count()==0, 'No price on upcoming lighter'
  assert page.locator('.travel-gallery-controls button').count()==3, 'Galería Sarike con tres fotos'
  assert 'pendientes de verificación independiente' not in page.locator('#product-modal-content').inner_text().lower(), 'No verificación en ficha Sarike'
  assert 'declarado por el proveedor' not in page.locator('#product-modal-content').inner_text().lower(), 'Combustible sin expresión redundante'
  assert 'existencias por confirmar' not in page.locator('#product-modal-content').inner_text().lower(), 'Sin frases de existencias Sarike'
  assert 'Las características se muestran según la información disponible' not in page.locator('#product-modal-content').inner_text(), 'Sin aviso genérico en Sarike'
  page.locator('#product-modal-close').click()
  page.locator('[data-filter="cortadores"]').click()
  assert page.locator('.product-card').count()==1, 'Nueva categoría cortadores'
  assert page.locator('.product-card[data-id="cortador-v-geometrico"]').count()==1, 'El cortapuros conserva la tarjeta actual'
  assert page.locator('.product-card[data-id="cortador-v-geometrico"] .product-badge').inner_text()=='PRÓXIMAMENTE', 'Cortapuros: etiqueta próxima'
  assert page.locator('.product-card[data-id="cortador-v-geometrico"] .product-availability').inner_text()=='Disponibilidad prevista: enero de 2027', 'Cortapuros: mes previsto'
  page.locator('.product-card[data-id="cortador-v-geometrico"] [data-detail]').click()
  assert page.locator('#product-modal-name').inner_text()=='Cortapuros en V de metal con acabado geométrico', 'Detalle cortapuros'
  assert page.locator('.modal-availability').inner_text()=='Disponibilidad prevista: enero de 2027', 'Cortapuros: fecha en modal'
  assert page.locator('.travel-gallery-controls button').count()==5, 'Cinco vistas cortapuros'
  assert 'pendientes de verificación independiente' not in page.locator('#product-modal-content').inner_text().lower(), 'Sin verificación en ficha del cortador'
  assert 'desempeño pendiente de verificación' not in page.locator('#product-modal-content').inner_text().lower(), 'Sin desempeño no verificado en cortador'
  assert '(existencias por confirmar)' not in page.locator('#product-modal-content').inner_text().lower(), 'Sin existencias entre paréntesis'
  assert 'Las características se muestran según la información disponible' not in page.locator('#product-modal-content').inner_text(), 'Sin aviso genérico en cortador'
  page.locator('#product-modal-close').click()
  page.locator('[data-filter="humidores"]').click()
  assert page.locator('.product-card').count()==1, 'Filtrado'
  assert page.evaluate("window.__dtEvents.some(e=>e.event==='category_filter'&&e.filter==='humidores')"), 'Telemetry filter actual change'
  assert page.locator('.product-card').first.get_attribute('data-dt-enhanced')=='true', 'Animación tras filtro'
  page.locator('.product-card [data-add]').click()
  assert page.locator('#cart-count').inner_text()=='1', 'Contador selección'
  assert page.evaluate("window.__dtEvents.some(e=>e.event==='selection_add'&&e.product_id==='humidor-viaje-5-puros')"), 'Telemetry selection add'
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
  assert page.locator('.product-card[data-id="cenicero-mesa"]').count()==1, 'Misma estructura de las fichas'
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
  assert page.locator('.product-card[data-id="estuche-kit-viaje"]').count()==1, 'Cuarto producto sin ampliar las siete tarjetas'
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
  assert page.evaluate("window.__dtEvents.some(e=>e.event==='gallery_navigation'&&e.product_id==='reposa-puros-plegable')"), 'Telemetry gallery change'
  page.locator('#product-modal-content [data-add]').click()
  assert page.locator('#cart-count').inner_text()=='2', 'Añadir soporte sin romper selección'
  page.locator('#product-modal-close').click()
  for asset in ['reposa-puros-dos-acabados.webp','reposa-puros-plata.webp','reposa-puros-negro.webp']:
   assert (PROJECT/'assets/products'/asset).is_file(), f'Falta imagen {asset}'
  # Simulación determinista de Pointer Events táctiles en Chromium móvil.
  # Safari iOS y Samsung Internet reales requieren una validación posterior en hardware.
  def swipe(selector, x1, y1, x2, y2):
   # Pointer Events sintéticos emitidos sincrónicamente en el MISMO task de
   # Chromium: evita que el harness introduzca latencia artificial entre eventos.
   node=page.locator(selector)
   result=node.evaluate("""(el,p) => {
     const [x1,y1,x2,y2]=p;
     const opts={pointerType:'touch',pointerId:17,isPrimary:true,
                 bubbles:true,cancelable:true,composed:true};
     const emit=(name,x,y)=>el.dispatchEvent(new PointerEvent(name,{...opts,clientX:x,clientY:y}));
     emit('pointerdown',x1,y1);
     emit('pointermove',(x1+x2)/2,(y1+y2)/2);
     const followed=el.style.transform.includes('translate3d');
     const engaged=el.classList.contains('dt-swipe-dragging');
     emit('pointerup',x2,y2);
     return {followed,engaged,stuck:el.style.transform.includes('translate3d'),
       width:innerWidth,buttons:document.querySelectorAll('.travel-gallery-controls button').length,
       zoom:!!document.querySelector('#dt-photo-lightbox.dt-zoomed'),
       modal:document.querySelector('#product-modal').classList.contains('open')};
   }""",[x1,y1,x2,y2])
   is_horizontal=abs(x2-x1)>60 and abs(x2-x1)>abs(y2-y1)*1.4
   if is_horizontal and not result['zoom']:
    assert result['followed'] and result['engaged'], f'La imagen no siguió el dedo {selector} / {name}: {result}'
   assert not result['stuck'], f'Transformación pegada {selector} / {name}: {result}'
  # Galería V4: validar imágenes completas, navegación y ampliación en todos los artículos.
  page.locator('[data-filter="todos"]').click()
  cases = [
   ('humidor-viaje-5-puros',4),
   ('cenicero-mesa',5),
   ('estuche-viaje',5),
   ('estuche-kit-viaje',2),
   ('reposa-puros-plegable',3),
   ('cortador-v-geometrico',5),
   ('encendedor-sarike-butano',3)
  ]
  for product_id,total in cases:
   page.locator(f'.product-card[data-id="{product_id}"] .product-image-trigger').click()
   image=page.locator('.modal-art .dt-image-open img')
   assert image.count()==1, f'Imagen ampliable en {product_id}'
   assert page.locator('#product-modal-close').is_visible(), f'Cerrar detalle disponible en {name} / {product_id}'
   close_style=page.locator('#product-modal-close').evaluate("""el => {
     const rect=el.getBoundingClientRect(), css=getComputedStyle(el);
     return {width:rect.width,height:rect.height,radius:css.borderRadius,
             background:css.backgroundColor,label:el.getAttribute('aria-label')};
   }""")
   if touch:
    assert close_style['width']>=44 and close_style['height']>=44, f'Cierre tactil pequeño en {name} / {product_id}: {close_style}'
    assert close_style['radius']=='50%',f'Cierre circular móvil {name} / {product_id}'
   assert close_style['label']=='Cerrar detalle',f'Nombre accesible de salida en {name} / {product_id}'

   assert image.evaluate('(img)=>getComputedStyle(img).objectFit')=='contain', f'Fotografía sin recorte {product_id}'
   assert page.locator('.dt-gallery-status').count()==0, f'Sin contador superior duplicado {product_id}'
   assert page.locator('.dt-image-hint').count()==0, f'Sin indicador visual superior redundante {product_id}'
   assert page.locator('.travel-gallery-controls button').count()==(total if total>1 else 0), f'Conservar indicadores inferiores {product_id}'
   assert page.locator('.dt-image-open').get_attribute('aria-label').startswith('Ampliar imagen:'), f'Imagen ampliable con etiqueta accesible {product_id}'
   if touch and total > 1:
    original=page.locator('.travel-gallery-controls [aria-pressed="true"]').get_attribute('data-photo-index')
    swipe('.dt-image-open',240,190,100,200)
    assert page.locator('.travel-gallery-controls [aria-pressed="true"]').get_attribute('data-photo-index')==str((int(original)+1)%total),f'Swipe a siguiente en {name} / {product_id}'
    unchanged=page.locator('.travel-gallery-controls [aria-pressed="true"]').get_attribute('data-photo-index')
    swipe('.dt-image-open',200,170,205,300)
    assert page.locator('.travel-gallery-controls [aria-pressed="true"]').get_attribute('data-photo-index')==unchanged, f'Scroll vertical no navega en {name} / {product_id}'
    swipe('.dt-image-open',100,190,240,200)
    assert page.locator('.travel-gallery-controls [aria-pressed="true"]').get_attribute('data-photo-index')==original,f'Swipe a anterior en {name} / {product_id}'
    # Pequeño arrastre accidental: volver suavemente sin cambiar la ficha.
    swipe('.dt-image-open',220,190,201,187)
    assert page.locator('.travel-gallery-controls [aria-pressed="true"]').get_attribute('data-photo-index')==original,f'Arrastre corto no cambia de foto en {name} / {product_id}'
    # El tap/click posterior al gesto debe ser ignorado, sin ampliar accidentalmente.
    page.locator('.dt-image-open').evaluate("""el => el.dispatchEvent(new PointerEvent('click', {bubbles:true,pointerType:'touch',pointerId:17}))""")
    assert not page.locator('#dt-photo-lightbox').is_visible(),f'Swipe no abre visor ampliado en {name}'
    # Un toque genuino NUEVO, incluso inmediato al swipe, sí debe ampliar.
    tap={'pointerType':'touch','pointerId':19,'isPrimary':True,'bubbles':True,
         'cancelable':True,'clientX':190,'clientY':180}
    page.locator('.dt-image-open').dispatch_event('pointerdown',tap)
    page.locator('.dt-image-open').dispatch_event('pointerup',tap)
    page.locator('.dt-image-open').evaluate("""el => el.dispatchEvent(new PointerEvent('click', {bubbles:true,pointerType:'touch',pointerId:19}))""")
    assert page.locator('#dt-photo-lightbox').is_visible(),f'Toque nuevo no bloqueado en {name} / {product_id}'
    page.keyboard.press('Escape')
   if total > 1:
    assert page.locator('.dt-gallery-nav-anterior').count()==1, f'Navegación anterior de respaldo {product_id}'
    assert page.locator('.dt-gallery-nav-siguiente').count()==1, f'Navegación siguiente de respaldo {product_id}'
    assert page.locator('.travel-gallery-controls button').count()==total, f'Número de vistas {product_id}'
    if touch:
     assert not page.locator('.dt-gallery-nav-anterior').is_visible(),f'Flecha anterior oculta en {name} / {product_id}'
     assert not page.locator('.dt-gallery-nav-siguiente').is_visible(),f'Flecha siguiente oculta en {name} / {product_id}'
     page.locator('.travel-gallery-controls button[data-photo-index="1"]').click()
     assert page.locator('.travel-gallery-controls button[data-photo-index="1"]').get_attribute('aria-pressed')=='true', f'Siguiente por indicador táctil {product_id}'
     page.locator('.travel-gallery-controls button[data-photo-index="0"]').click()
    else:
     assert page.locator('.dt-gallery-nav-anterior').is_visible(),f'Flecha anterior escritorio {product_id}'
     assert page.locator('.dt-gallery-nav-siguiente').is_visible(),f'Flecha siguiente escritorio {product_id}'
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
   assert page.locator('#dt-lightbox-counter').is_visible(), f'Indicador del visor ampliado preservado {product_id}'
   assert page.locator('#dt-lightbox-image').evaluate('(img)=>getComputedStyle(img).objectFit')=='contain', f'Ampliada sin recorte {product_id}'
   if total > 1:
    page.locator('#dt-lightbox-next').click()
    assert page.locator('.travel-gallery-controls button').filter(has=page.locator('[aria-pressed="true"]')).count() >= 0
   if touch and total > 1:
    active=int(page.locator('.travel-gallery-controls [aria-pressed="true"]').get_attribute('data-photo-index'))
    swipe('#dt-lightbox-image',240,200,100,208)
    assert page.locator('.travel-gallery-controls [aria-pressed="true"]').get_attribute('data-photo-index')==str((active+1)%total), f'Swipe visor en {name} / {product_id}'
    swipe('#dt-lightbox-image',100,200,240,208)
    assert page.locator('.travel-gallery-controls [aria-pressed="true"]').get_attribute('data-photo-index')==str(active), f'Retroceso visor en {name} / {product_id}'
   page.locator('#dt-lightbox-zoom').click()
   assert page.locator('#dt-photo-lightbox').get_attribute('class').find('dt-zoomed')>=0, f'Zoom {product_id}'
   if touch and total > 1:
    active=page.locator('.travel-gallery-controls [aria-pressed="true"]').get_attribute('data-photo-index')
    swipe('#dt-lightbox-image',240,200,100,208)
    assert page.locator('.travel-gallery-controls [aria-pressed="true"]').get_attribute('data-photo-index')==active, f'Zoom bloquea swipe en {name} / {product_id}'
   page.locator('#dt-lightbox-zoom').click()
   assert 'dt-zoomed' not in page.locator('#dt-photo-lightbox').get_attribute('class'), f'Reducir zoom {product_id}'
   page.keyboard.press('Escape')
   assert not page.locator('#dt-photo-lightbox').is_visible(), f'Cerrar ampliación {product_id}'
   assert page.locator('#product-modal').get_attribute('aria-hidden')=='false', f'Conservar ficha abierta {product_id}'
   page.locator('#product-modal-close').click()
  if touch:
   page.locator('#menu-toggle').click()
   assert page.locator('#mobile-nav').is_visible(),'menú móvil'
   page.locator('#mobile-nav a').first.click()
   assert not page.locator('#mobile-nav').is_visible(),'cerrar menú móvil'
  page.emulate_media(reduced_motion='reduce')
  assert page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"), 'Respeta preferencia del sistema'
  page.emulate_media(reduced_motion='no-preference')
  assert 'Sitio en preparación' not in page.locator('.footer-bottom').inner_text(), 'Se retiró la leyenda obsoleta'
  assert page.locator('.footer-bottom .footer-credit a[href="https://rauvia.com.mx/"]').count()==1, 'Crédito RAUVIA en footer'
  credit=page.locator('.footer-bottom .footer-credit').bounding_box()
  footer=page.locator('.footer-bottom').bounding_box()
  assert credit is not None and footer is not None and credit['x']+credit['width']>=footer['x']+footer['width']-18, 'Crédito alineado a la derecha'
  overflow=page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2')
  assert not overflow, f'Overflow horizontal {name}'
  assert not errors, f'Errores JS {name}: {errors}'
  print(name,'OK','screenshot',f'tests/{name}.png')
  page.close()
 browser.close()

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

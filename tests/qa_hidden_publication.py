"""Regresión real del navegador: un artículo hidden no invalida los demás precios.
No utiliza MySQL ni red externa; intercepta /api/catalog con siete productos públicos.
"""
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = re.sub(r'<script defer src="[^"]+"></script>', '', (ROOT/'index.html').read_text())
BASE = 'http://donturron.test/'

with sync_playwright() as p:
 browser = p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for scenario in ('hidden','all_hidden','unavailable'):
  page = browser.new_page()
  errors = []
  page.on('pageerror', lambda err: errors.append(str(err)))
  state = {'products':None}

  def intercept(route):
   pathname = route.request.url.split('?',1)[0].replace(BASE,'/')
   if pathname in ('/', '/index.html'):
    route.fulfill(status=200,content_type='text/html',body=HTML)
   elif pathname == '/api/catalog':
    if scenario == 'unavailable':
     route.fulfill(status=503,content_type='application/json',body='{"error":"catalog_unavailable"}')
    else:
     assert state['products'] is not None, 'Los productos de prueba deben estar cargados'
     route.fulfill(status=200,content_type='application/json',
       body=json.dumps({'version':1,'source':'don-turron-inventory','products':state['products']}))
   else:
    route.fulfill(status=404,content_type='text/plain',body='')

  page.route('**/*',intercept)
  page.goto(BASE,wait_until='domcontentloaded')
  page.add_script_tag(content=(ROOT/'config.js').read_text())
  page.add_script_tag(content=(ROOT/'catalog.js').read_text())
  products = page.evaluate("window.DON_TURRON_CATALOG")
  assert len(products)==8
  hidden_id='reposa-puros-plegable'
  if scenario == 'hidden':
   state['products']=[product for product in products if product['id']!=hidden_id]
   # Un artículo oculto seleccionado antes de refrescar el catálogo no debe
   # sobrevivir en carrito ni conservar un enlace de WhatsApp incorrecto.
   page.evaluate("""() => localStorage.setItem(
      'dt-selection-v1', JSON.stringify({'reposa-puros-plegable':1,'humidor-viaje-5-puros':1})
   )""")
  elif scenario == 'all_hidden':
   state['products']=[]
  else:
   state['products']=products
  page.add_script_tag(content=(ROOT/'app.js').read_text())
  if scenario == 'hidden':
   page.wait_for_function("document.querySelectorAll('.product-card').length===7",timeout=6000)
   assert page.locator(f'.product-card[data-id="{hidden_id}"]').count()==0
   assert page.locator('#result-count').inner_text()=='7 artículos'
   for product in products:
    if product['id']==hidden_id:continue
    card=page.locator(f'.product-card[data-id="{product["id"]}"]')
    assert card.count()==1,product['id']
    price=product.get('retailPrice')
    if price:
     assert '$'+str(price['amount']) in card.locator('.product-price').inner_text(),product['id']
    else:
     assert card.locator('.product-price').inner_text()=='Precio por confirmar',product['id']
   assert page.locator('#cart-count').inner_text()=='1', 'Quitar producto hidden de selección'
   remaining=json.loads(page.evaluate("localStorage.getItem('dt-selection-v1')"))
   assert hidden_id not in remaining, 'Persistencia de selección sin hidden'
   page.locator('[data-filter="estuches"]').click()
   assert page.locator('.product-card').count()==2, 'Otros filtros siguen operativos'
  elif scenario == 'all_hidden':
   page.wait_for_function("document.querySelectorAll('.product-card').length===0",timeout=6000)
   assert page.locator('#result-count').inner_text()=='0 artículos'
  else:
   page.wait_for_function("""() => [...document.querySelectorAll('.product-card')]
     .every(card=>card.querySelector('.product-price').textContent.includes('Precio por confirmar'))""",timeout=6000)
   assert page.locator('.product-card').count()==8, 'Fallo real de BD mantiene fichas sin confirmación'
  assert not errors, scenario+': '+str(errors)
  page.close()
 browser.close()
print('OK: hidden individual, otros precios intactos, carrito depurado, catálogo vacío y fallback 503')

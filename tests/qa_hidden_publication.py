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
 for scenario in ('hidden','all_hidden','unavailable','added','sold_out','publication_sold_out','humidor_sold_out'):
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
  hidden_id='cenicero-mesa'
  if scenario == 'hidden':
   state['products']=[product for product in products if product['id']!=hidden_id]
   # Un artículo oculto seleccionado antes de refrescar el catálogo no debe
   # sobrevivir en carrito ni conservar un enlace de WhatsApp incorrecto.
   page.evaluate("""() => localStorage.setItem(
      'dt-selection-v1', JSON.stringify({'cenicero-mesa':1,'humidor-viaje-5-puros':1})
   )""")
  elif scenario == 'all_hidden':
   state['products']=[]
  elif scenario == 'added':
   import copy
   new=copy.deepcopy(products[0])
   new.update({'id':'nuevo-producto-kyberion','name':'Producto nuevo desde Kyberion',
     'category':'nuevos-productos','categoryLabel':'Nuevos productos',
     'description':'Descripción de una alta de catálogo sin recompilar',
     'images':[],'variants':[],'art':'case','stock':3,
     'retailPrice':{'amount':1290,'currency':'MXN'}})
   state['products']=[*products,new]
  elif scenario == 'sold_out':
   state['products']=[{**p,'stock':0} if p['id']=='cenicero-mesa' else p for p in products]
  elif scenario == 'publication_sold_out':
   state['products']=[{**p,'publicationStatus':'Out of stock','stock':3} if p['id']=='cenicero-mesa' else p for p in products]
   page.evaluate("""() => localStorage.setItem('dt-selection-v1', JSON.stringify({'cenicero-mesa':1,'humidor-viaje-5-puros':1}))""")
  elif scenario == 'humidor_sold_out':
   state['products']=[{**p,'publicationStatus':'Out of stock'} if p['id']=='humidor-viaje-5-puros' else p for p in products]
  else:
   state['products']=products
  page.add_script_tag(content=(ROOT/'app.js').read_text())
  page.locator('#age-yes').click()
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
  elif scenario == 'added':
   page.wait_for_function("document.querySelectorAll('.product-card').length===9",timeout=6000)
   new=page.locator('.product-card[data-id="nuevo-producto-kyberion"]')
   assert new.count()==1, 'La nueva alta debe aparecer'
   assert '$1,290 MXN' in new.locator('.product-price').inner_text()
   category=page.locator('[data-filter="nuevos-productos"]')
   assert category.count()==1, 'Crear filtro automáticamente para categoría de Kyberion'
   category.click()
   assert page.locator('.product-card').count()==1
   new.locator('[data-add]').click()
   assert page.locator('#cart-count').inner_text()=='1'
  elif scenario == 'humidor_sold_out':
   page.wait_for_function("""() => {
     const card=document.querySelector('[data-id="humidor-viaje-5-puros"]');
     return card && card.querySelector('.product-badge')?.textContent === 'AGOTADO' &&
       card.querySelector('[data-add]:disabled');
   }""",timeout=6000)
   card=page.locator('.product-card[data-id="humidor-viaje-5-puros"]')
   assert card.count()==1
   assert card.locator('.product-badge').inner_text()=='AGOTADO'
   assert 'NUEVA PIEZA' not in card.inner_text()
   assert '$649 MXN' in card.locator('.product-price').inner_text()
   assert card.locator('[data-add]').is_disabled()
   assert card.locator('[data-add]').inner_text().startswith('Agotado')
   detail=card.locator('[data-detail]')
   detail.click()
   modal=page.locator('#product-modal-content')
   assert 'Agotado' in modal.inner_text()
   assert modal.locator('[data-add]').is_disabled()
   assert '$299 MXN' in page.locator('.product-card[data-id="estuche-viaje"] .product-price').inner_text()
  elif scenario == 'publication_sold_out':
   page.wait_for_function("""() => {
     const card=document.querySelector('.product-card[data-id="cenicero-mesa"]');
     return card && card.querySelector('[data-add]:disabled') && card.innerText.includes('Agotado');
   }""",timeout=6000)
   card=page.locator('.product-card[data-id="cenicero-mesa"]')
   assert card.count()==1
   assert page.locator('.product-card').count()==8
   assert '$549 MXN' in card.locator('.product-price').inner_text()
   assert 'unidades disponibles' not in card.inner_text()
   assert page.locator('#cart-count').inner_text()=='1'
   remaining=json.loads(page.evaluate("localStorage.getItem('dt-selection-v1')"))
   assert 'cenicero-mesa' not in remaining
   assert '$649 MXN' in page.locator('.product-card[data-id="humidor-viaje-5-puros"] .product-price').inner_text()
  elif scenario == 'sold_out':
   page.wait_for_function("""() => {
    const p=document.querySelector('[data-id="cenicero-mesa"]');
    return p && !!p.querySelector('[data-add]:disabled');
   }""",timeout=6000)
   exhausted=page.locator('.product-card[data-id="cenicero-mesa"]')
   assert 'Agotado' in exhausted.inner_text()
   assert exhausted.locator('[data-add]').is_disabled()
   assert '$549 MXN' in exhausted.locator('.product-price').inner_text(), 'El precio no desaparece por stock cero'
   assert '$649 MXN' in page.locator('.product-card[data-id="humidor-viaje-5-puros"] .product-price').inner_text()
  else:
   page.wait_for_function("""() => [...document.querySelectorAll('.product-card')]
     .every(card=>card.querySelector('.product-price').textContent.includes('Precio por confirmar'))""",timeout=6000)
   assert page.locator('.product-card').count()==8, 'Fallo real de BD mantiene fichas sin confirmación'
  assert not errors, scenario+': '+str(errors)
  page.close()
 browser.close()
print('OK: altas, bajas, agotados, filtros nuevos, precios y carrito; fallback 503')

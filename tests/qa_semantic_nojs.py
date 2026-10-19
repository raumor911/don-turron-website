"""DT Semantic V1 — smoke de rutas directas y contenido disponible sin JS."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass

with ThreadingHTTPServer(('127.0.0.1',0),partial(SilentHandler,directory=str(ROOT))) as server:
    thread=Thread(target=server.serve_forever,daemon=True)
    thread.start()
    base=f'http://127.0.0.1:{server.server_port}'
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(java_script_enabled=False)
        page=context.new_page()
        response=page.goto(base+'/',wait_until='domcontentloaded')
        assert response.status==200
        assert page.locator('.product-card').count()==7,'Catálogo estático recuperable sin JS'
        assert 'noindex' in page.locator('meta[name=robots]').get_attribute('content')
        product_ids=['humidor-viaje-5-puros','cenicero-mesa','estuche-viaje','estuche-kit-viaje','reposa-puros-plegable','cortador-v-geometrico']
        for product_id in product_ids:
            response=page.goto(base+'/productos/'+product_id+'/',wait_until='domcontentloaded')
            assert response.status==200,f'Acceso directo {product_id}'
            assert page.locator('h1').count()==1,f'H1 ausente {product_id}'
            assert page.locator('.dt-images img').count()>=2,f'Fotografías {product_id}'
            assert page.locator('meta[name=robots]').get_attribute('content')=='noindex, nofollow'
            assert page.locator('script[type="application/ld+json"]').count()==1
            assert page.locator('a[href="../../index.html#coleccion"]').count()>0
        assert page.request.get(base+'/productos/encendedor-jet/').status==404,'Conceptual no debe tener página'
        response=page.goto(base+'/guia/estuche-o-humidor/',wait_until='domcontentloaded')
        assert response.status==200 and page.locator('h1').count()==1
        assert page.locator('meta[name=robots]').get_attribute('content')=='noindex, nofollow'
        print('DT static no-JS: 7 cards, 6 product routes, 1 guide, noindex OK')
        context.close();browser.close()
    server.shutdown()

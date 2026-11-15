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
        assert page.locator('.product-card').count()==8,'Ocho productos reales sin JS'
        faq_items=page.locator('#preguntas .faq-items details')
        assert faq_items.count()==8,'Ocho preguntas FAQ disponibles sin JS'
        questions=faq_items.locator('summary').all_inner_texts()
        assert any('¿Don Turrón vende puros?' in q for q in questions),'Se conserva la pregunta sobre puros'
        puros=faq_items.filter(has_text='¿Don Turrón vende puros?')
        assert puros.locator('p').text_content()=='El alcance de este sitio es la exhibición de accesorios para puros. No se ofrecen puros ni tabaco a través de este catálogo.','Se conserva la respuesta original sobre puros'
        faq_text=page.locator('#preguntas').text_content()
        for statement in ('$500 MXN','15:00','Ciudad de México','OXXO','7-Eleven','Walmart','Bodega Aurrera','RAUVIA','WhatsApp'):
            assert statement in faq_text, f'FAQ incompleto: {statement}'
        assert 'Las condiciones, cobertura y costos de envío todavía no están confirmados' not in faq_text,'Sin envío obsoleto'

        assert page.locator('.product-card[data-id="encendedor-jet"]').count()==0,'Sin ficha ficticia'
        assert page.locator('meta[name=robots]').get_attribute('content') == 'index, follow'
        assert page.locator('link[rel=canonical]').get_attribute('href') == 'https://www.donturron.com.mx/'
        for item in ('cortador-v-geometrico','encendedor-sarike-butano','encendedor-honest-punch'):
            card=page.locator(f'.product-card[data-id="{item}"]')
            assert card.locator('.product-badge').inner_text()=='DISPONIBLE',item
            assert card.locator('.product-availability').count()==0,item
            assert card.locator('[data-variant-color]').count()==1,item
        parike=page.locator('.product-card[data-id="encendedor-sarike-butano"]')
        assert parike.locator('.product-stock').inner_text()=='Plata: SIN EXISTENCIA · Dorado: Disponible'
        assert parike.locator('option[value="Plata"]').is_disabled()
        assert page.locator('.product-availability').count()==0,'No upcoming launch badges'
        expected={'humidor-viaje-5-puros':649,'cenicero-mesa':549,'estuche-viaje':299,'estuche-kit-viaje':949,'reposa-puros-plegable':189,'cortador-v-geometrico':479,'encendedor-sarike-butano':719,'encendedor-honest-punch':489}
        for item,amount in expected.items():
            card=page.locator(f'.product-card[data-id="{item}"]')
            assert card.locator('.product-price').inner_text().startswith(f'${amount} MXN'),item
            assert 'IVA incluido' in card.locator('.product-price').inner_text(),item
        assert page.locator('.product-price').count()==8,'Eight products have a retail price'

        # Los precios y estados deben coincidir entre catálogo, grafo y ficha.
        api_products=page.request.get(base+'/ai/products.json').json()['products']
        graph=page.request.get(base+'/ai/knowledge-graph.json').json()['nodes']
        for item,amount in expected.items():
            api=next(p for p in api_products if p['id']==item)
            node=next(n for n in graph if n['id']==item)
            assert api['retailPrice']=={'amount':amount,'currency':'MXN','taxIncluded':True,'shippingIncluded':False},item
            assert node['retailPrice']==api['retailPrice'],item
        for item in ('cortador-v-geometrico','encendedor-sarike-butano','encendedor-honest-punch'):
            api=next(p for p in api_products if p['id']==item)
            node=next(n for n in graph if n['id']==item)
            assert api['launchWindow'] is None,item
            assert node.get('launchWindow') in (None,{}),item
            assert api['commercialStatus']=='available',item
        assert sum(bool(p.get('launchWindow')) for p in api_products)==0,'No outdated planned launches'
        variants=next(p for p in api_products if p['id']=='encendedor-sarike-butano')['variants']
        assert variants[0]['status']=='unavailable' and variants[0]['stock']==0
        assert variants[1]['status']=='available'
        product_ids=['humidor-viaje-5-puros','cenicero-mesa','estuche-viaje','estuche-kit-viaje','reposa-puros-plegable','cortador-v-geometrico','encendedor-sarike-butano','encendedor-honest-punch']
        for product_id in product_ids:
            response=page.goto(base+'/productos/'+product_id+'/',wait_until='domcontentloaded')
            assert response.status==200,f'Acceso directo {product_id}'
            assert page.locator('h1').count()==1,f'H1 ausente {product_id}'
            assert page.locator('.dt-launch').count()==0,product_id
            assert page.locator('.dt-retail-price').count()==1,product_id
            assert 'IVA incluido' in page.locator('.dt-retail-price').inner_text(),product_id
            assert 'Envío no incluido' in page.locator('.dt-retail-price').inner_text(),product_id
            assert '"offers"' not in page.locator('script[type="application/ld+json"]').inner_text().lower(),'No unsupported checkout Offer'
            if product_id=='encendedor-sarike-butano':
                assert 'Plata: SIN EXISTENCIA' in page.locator('.dt-main').inner_text()
            assert page.locator('.dt-images img').count()>=2,f'Fotografías {product_id}'
            assert page.locator('meta[name=robots]').get_attribute('content')=='index, follow'
            assert page.locator('script[type="application/ld+json"]').count()==1
            assert page.locator('a[href="../../index.html#coleccion"]').count()>0
        assert page.request.get(base+'/productos/encendedor-jet/').status==404,'Conceptual no debe tener página'
        response=page.goto(base+'/guia/estuche-o-humidor/',wait_until='domcontentloaded')
        assert response.status==200 and page.locator('h1').count()==1
        assert page.locator('meta[name=robots]').get_attribute('content')=='index, follow'
        print('DT preview static no-JS: 8 priced products; Parike silver blocked; product routes and canonical retained')
        context.close();browser.close()
    server.shutdown()

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
        assert puros.locator('p').inner_text()=='El alcance de este sitio es la exhibición de accesorios para puros. No se ofrecen puros ni tabaco a través de este catálogo.','Se conserva la respuesta original sobre puros'
        faq_text=page.locator('#preguntas').text_content()
        for statement in ('$500 MXN','15:00','Ciudad de México','OXXO','7-Eleven','Walmart','Bodega Aurrera','RAUVIA','WhatsApp'):
            assert statement in faq_text, f'FAQ incompleto: {statement}'
        assert 'Las condiciones, cobertura y costos de envío todavía no están confirmados' not in faq_text,'Sin envío obsoleto'

        assert page.locator('.product-card[data-id="encendedor-jet"]').count()==0,'Sin ficha ficticia'
        assert 'noindex' in page.locator('meta[name=robots]').get_attribute('content')
        for item in ('cortador-v-geometrico','encendedor-sarike-butano','encendedor-honest-punch'):
            card=page.locator(f'.product-card[data-id="{item}"]')
            assert card.locator('.product-badge').inner_text()=='PRÓXIMAMENTE',item
            assert card.locator('.product-availability').inner_text()=='Disponibilidad prevista: enero de 2027',item
        assert page.locator('.product-availability').count()==3,'Three future availability dates'
        expected={'humidor-viaje-5-puros':649,'cenicero-mesa':549,'estuche-viaje':299,'estuche-kit-viaje':949,'reposa-puros-plegable':189}
        for item,amount in expected.items():
            card=page.locator(f'.product-card[data-id="{item}"]')
            assert card.locator('.product-price').inner_text().startswith(f'${amount} MXN'),item
            assert 'IVA incluido' in card.locator('.product-price').inner_text(),item
        for item in ('cortador-v-geometrico','encendedor-sarike-butano','encendedor-honest-punch'):
            assert page.locator(f'.product-card[data-id="{item}"] .product-price').inner_text()=='Precio por confirmar',item

        # El dato semántico y el gráfico deben conservar el mes objetivo, sin publicar oferta.
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
            assert api['launchWindow']['month']=='2027-01'
            assert api['launchWindow']['status']=='planned'
            assert node['launchWindow']['month']=='2027-01'
            assert api['commercialStatus']=='pending_confirmation'
        assert sum(bool(p.get('launchWindow')) for p in api_products)==3,'Three planned launches in AI contract'
        product_ids=['humidor-viaje-5-puros','cenicero-mesa','estuche-viaje','estuche-kit-viaje','reposa-puros-plegable','cortador-v-geometrico','encendedor-sarike-butano','encendedor-honest-punch']
        for product_id in product_ids:
            response=page.goto(base+'/productos/'+product_id+'/',wait_until='domcontentloaded')
            assert response.status==200,f'Acceso directo {product_id}'
            assert page.locator('h1').count()==1,f'H1 ausente {product_id}'
            if product_id in ('cortador-v-geometrico','encendedor-sarike-butano','encendedor-honest-punch'):
                assert page.locator('.dt-launch').inner_text()=='Disponibilidad prevista: enero de 2027',product_id
                assert '"offers"' not in page.locator('script[type="application/ld+json"]').inner_text().lower(),'No commercial offer permitted'
            else:
                assert page.locator('.dt-launch').count()==0,product_id
                assert page.locator('.dt-retail-price').count()==1,product_id
                assert 'IVA incluido' in page.locator('.dt-retail-price').inner_text(),product_id
                assert 'Envío no incluido' in page.locator('.dt-retail-price').inner_text(),product_id
            assert page.locator('.dt-images img').count()>=2,f'Fotografías {product_id}'
            assert page.locator('meta[name=robots]').get_attribute('content')=='noindex, nofollow'
            assert page.locator('script[type="application/ld+json"]').count()==1
            assert page.locator('a[href="../../index.html#coleccion"]').count()>0
        assert page.request.get(base+'/productos/encendedor-jet/').status==404,'Conceptual no debe tener página'
        response=page.goto(base+'/guia/estuche-o-humidor/',wait_until='domcontentloaded')
        assert response.status==200 and page.locator('h1').count()==1
        assert page.locator('meta[name=robots]').get_attribute('content')=='noindex, nofollow'
        print('DT static no-JS: 8 cards, 8 product routes, 1 guide, noindex OK')
        context.close();browser.close()
    server.shutdown()

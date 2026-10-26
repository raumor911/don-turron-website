"""Real HTTP mobile smoke; never sends messages or processes a payment."""
import json, os
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self,*_args): pass
with ThreadingHTTPServer(('127.0.0.1',0),partial(SilentHandler,directory=str(ROOT))) as server:
    Thread(target=server.serve_forever,daemon=True).start()
    base=os.environ.get('DT_LIVE_URL',f'http://127.0.0.1:{server.server_port}')
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
        for width,height in [(390,844),(360,780),(1440,900)]:
            page=browser.new_page(viewport={'width':width,'height':height},is_mobile=width<600,has_touch=width<600,device_scale_factor=2)
            errors=[]
            page.on('pageerror',lambda e: errors.append(str(e)))
            assert page.goto(base+'/',wait_until='networkidle').status==200
            page.locator('#age-yes').click()
            if width<600:
                assert page.locator('.hero h1 .dt-title-line').evaluate_all("nodes=>nodes.every(n=>getComputedStyle(n).animationName==='none')"), 'Essential title still waits for animation'
            assert page.locator('.hero-photo img').evaluate("img=>img.complete && img.naturalWidth>0"), 'Hero image failed to decode'
            logo=page.locator('.brand-icon img').bounding_box()
            assert abs(logo['width']/logo['height']-520/461)<0.02, 'Monogram aspect ratio changed'
            page.screenshot(path=str(ROOT/f'tests/http-home-{width}.png'),full_page=True)
            assert page.locator('link[rel=canonical]').get_attribute('href')=='https://www.donturron.com.mx/'
            assert page.locator('meta[name=robots]').get_attribute('content')=='index, follow'
            assert page.evaluate("document.fonts.check('400 16px Manrope') && document.fonts.check('italic 400 16px \"Cormorant Garamond\"')"), 'Original local fonts not loaded'
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
            card=page.locator('[data-id="cenicero-mesa"]')
            card.locator('[data-add]').click()
            page.locator('#open-selection').click()
            link=page.locator('#whatsapp-selection')
            href=link.get_attribute('href')
            assert href.startswith('https://wa.me/525586494076?text='), href
            assert 'cenicero' in href.lower()
            assert link.is_visible() and link.get_attribute('aria-disabled')!='true'
            page.locator('#close-selection').click()
            page.reload(wait_until='networkidle')
            assert page.locator('#cart-count').inner_text()=='1', 'Selection persisted after reload'
            page.locator('[data-id="cenicero-mesa"] [data-open-photo]').click()
            assert page.locator('#product-modal').get_attribute('aria-hidden')=='false'
            page.locator('[data-photo-index="1"]').click()
            assert page.locator('[data-photo-index="1"]').get_attribute('aria-pressed')=='true'
            page.screenshot(path=str(ROOT/f'tests/http-gallery-{width}.png'))
            assert not errors, errors
            # All rendered product photos must have downloaded and decoded successfully.
            assert page.locator('.travel-photo-card').evaluate_all('(imgs)=>imgs.every(i=>i.complete && i.naturalWidth>0)'), 'Missing card derivative'
            print(json.dumps({'width':width,'selection':'persisted','whatsapp':'valid link, not sent','gallery':'passed','errors':errors}))
            page.close()
        browser.close()

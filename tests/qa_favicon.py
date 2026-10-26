"""Don Turrón — favicon monograma transparente en portada y recursos estáticos."""
from html.parser import HTMLParser
from pathlib import Path
import struct
ROOT=Path(__file__).resolve().parents[1]
EXPECTED={
    "favicon.ico":None,
    "assets/favicon-16x16.png":(16,16),
    "assets/favicon-32x32.png":(32,32),
    "assets/favicon-monogram-black.png":(512,512),
    "assets/favicon-monogram-gold.png":(512,512),
    "assets/apple-touch-icon.png":(180,180)
}
class Icons(HTMLParser):
    def __init__(self):
        super().__init__()
        self.icons=[]
    def handle_starttag(self,tag,attrs):
        if tag!='link':return
        a=dict(attrs)
        if a.get('rel') in ('icon','apple-touch-icon'):
            self.icons.append(a)

def png_info(data):
    assert data[:8]==b'\x89PNG\r\n\x1a\n','Not a PNG'
    width,height,depth,color=struct.unpack('>IIBB',data[16:26])
    assert depth==8 and color==6,'Favicon must be 8-bit RGBA with alpha channel'
    return width,height

for rel,size in EXPECTED.items():
    path=ROOT/rel
    assert path.is_file(),f'Missing {rel}'
    b=path.read_bytes()
    if size is not None:
        assert png_info(b)==size,f'Incorrect size/alpha for {rel}'
    else:
        reserved,kind,count=struct.unpack('<HHH',b[:6])
        assert (reserved,kind)==(0,1) and count>=4,'Invalid multiresolution ICO'

pages=[ROOT/'index.html',*sorted((ROOT/'productos').glob('*/index.html')),ROOT/'guia/estuche-o-humidor/index.html']
assert len(pages)>=8,'Expected home, six products and guide'
for p in pages:
    html=p.read_text(encoding='utf-8')
    assert 'name="robots" content="index, follow"' in html,'Production indexing metadata missing'
    parser=Icons()
    parser.feed(html)
    hrefs=[icon['href'] for icon in parser.icons]
    assert len(hrefs)==len(EXPECTED),f'Missing favicon variants in {p}'
    assert not any('don-turron-emblema.jpg' in href for href in hrefs),f'Legacy favicon in {p}'
    for rel in EXPECTED:
        href=rel if p==ROOT/'index.html' else '../../'+rel
        assert href in hrefs,f'Expected link {href} in {p}'
        assert (p.parent/href).resolve().is_file(),f'Broken relative favicon URL {href}'
    assert any(x.get('media')=='(prefers-color-scheme: dark)' and 'favicon-monogram-gold' in x.get('href','') for x in parser.icons)
    assert any(x.get('media')=='(prefers-color-scheme: light)' and 'favicon-monogram-black' in x.get('href','') for x in parser.icons)
assert 'favicon-monogram-gold.png' in (ROOT/'scripts/dt-semantic/pages.mjs').read_text(encoding='utf-8')
print('DT-FAVICON: PNG RGBA and ICO valid, all favicon links resolve on',len(pages),'pages')

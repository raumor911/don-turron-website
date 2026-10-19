"""Verifica crédito RAUVIA visible en portada y plantillas estáticas."""
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
class Links(HTMLParser):
    def __init__(self):
        super().__init__();self.foot=False;self.capture=False;self.matches=[];self.href=None;self.words=''
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='footer':self.foot=True
        if self.foot and tag=='a' and a.get('href')=='https://rauvia.com.mx/':
            self.capture=True;self.href=a['href'];self.attrs=a;self.words=''
    def handle_data(self,text):
        if self.capture:self.words+=text
    def handle_endtag(self,tag):
        if tag=='a' and self.capture:
            self.matches.append((self.href,self.words.strip(),self.attrs))
            self.capture=False
        if tag=='footer':self.foot=False
pages=[ROOT/'index.html',*sorted((ROOT/'productos').glob('*/index.html')),ROOT/'guia/estuche-o-humidor/index.html']
assert len(pages)==9,f'Expected home, seven product pages and guide: {len(pages)}'
for p in pages:
    s=p.read_text(encoding='utf8')
    assert 'Experiencia digital desarrollada por' in s,p
    assert 'Sitio en preparación' not in s,p
    assert s.count('Experiencia digital desarrollada por')==1,p
    assert '<strong>RAUVIA Consulting</strong>' in s,p
    parser=Links();parser.feed(s)
    assert len(parser.matches)==1, f'Expected one RAUVIA link in footer of {p}'
    href,text,attrs=parser.matches[0]
    assert text=='RAUVIA Consulting' and href=='https://rauvia.com.mx/',p
    assert attrs.get('rel')=='noopener noreferrer' and attrs.get('target')=='_blank',p
print('DT footer verified on',len(pages),'pages')

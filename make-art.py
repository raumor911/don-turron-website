from pathlib import Path
assets=Path(__file__).parent/'assets'
head='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 360" role="img" aria-label="Ilustración conceptual de accesorio">
<defs>
 <linearGradient id="metal" x1="0" x2="1" y1="0" y2=".25"><stop stop-color="#5d3c22"/><stop offset=".16" stop-color="#ecd29c"/><stop offset=".43" stop-color="#b68548"/><stop offset=".59" stop-color="#f3daab"/><stop offset=".83" stop-color="#8d5c2d"/><stop offset="1" stop-color="#d6ad71"/></linearGradient>
 <linearGradient id="steel" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#e7d7b6"/><stop offset=".35" stop-color="#776957"/><stop offset=".55" stop-color="#fff2d3"/><stop offset=".88" stop-color="#3a2f25"/><stop offset="1" stop-color="#ad8f69"/></linearGradient>
 <linearGradient id="black" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#4e4437"/><stop offset=".35" stop-color="#151616"/><stop offset=".7" stop-color="#282321"/><stop offset="1" stop-color="#070a0a"/></linearGradient>
 <linearGradient id="wood" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#8b5b35"/><stop offset=".2" stop-color="#4a291c"/><stop offset=".56" stop-color="#97663e"/><stop offset="1" stop-color="#251713"/></linearGradient>
 <radialGradient id="inner"><stop stop-color="#332418"/><stop offset=".6" stop-color="#15120f"/><stop offset="1" stop-color="#090b0c"/></radialGradient>
 <filter id="shadow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="11"/></filter>
</defs>
<ellipse cx="210" cy="297" rx="112" ry="17" fill="#000" opacity=".35" filter="url(#shadow)"/>
'''
end='\n</svg>'
arts={
'cutter':'''<g transform="translate(205 179) rotate(-18)">
 <rect x="-77" y="-48" width="155" height="105" rx="18" fill="url(#metal)" stroke="#f5dcb2" stroke-width="2"/>
 <rect x="-62" y="-34" width="123" height="80" rx="10" fill="url(#black)" stroke="#5e4730" stroke-width="3"/>
 <circle cx="-36" cy="6" r="26" fill="url(#steel)" stroke="#d2b68c" stroke-width="3"/>
 <circle cx="-36" cy="6" r="13" fill="#16120f"/>
 <circle cx="34" cy="6" r="26" fill="url(#steel)" stroke="#d2b68c" stroke-width="3"/>
 <circle cx="34" cy="6" r="13" fill="#16120f"/>
 <path d="M-7 -36L17 42L34 -36Z" fill="url(#steel)" stroke="#fae1b5" stroke-width="1.5"/>
 <path d="M-88 -11H-65M64 -11H88" stroke="#e4c08e" stroke-width="5" stroke-linecap="round"/>
</g>''',
'lighter':'''<g transform="translate(210 168)">
<path d="M-55 -91C-55 -102 -43 -110 -28 -110H27C42 -110 55 -102 55 -91V90C55 104 44 113 27 113H-29C-45 113 -55 102 -55 90Z" fill="url(#metal)" stroke="#e7c392" stroke-width="2"/>
<rect x="-46" y="-77" width="92" height="181" rx="15" fill="url(#black)" stroke="#7c603d" stroke-width="2"/>
<path d="M-45 -56H45" stroke="#b58c58" stroke-width="2"/>
<rect x="-26" y="-119" width="51" height="23" rx="5" fill="url(#steel)" stroke="#c59d6c" stroke-width="2"/>
<rect x="-12" y="-129" width="23" height="13" rx="2" fill="#2e2924" stroke="#a58b63" stroke-width="2"/>
<path d="M-17 -2H17" stroke="#99744b" stroke-width="1" opacity=".8"/><path d="M0 -23v42" stroke="#99744b" stroke-width="1" opacity=".8"/>
<circle cx="0" cy="-2" r="19" fill="none" stroke="#a88963" stroke-width="1.5"/>
<path d="M-34 80H34" stroke="#ad8352" stroke-width="2"/>
</g>''',
'humidor':'''<g transform="translate(210 197)">
<path d="M-126 -24L-33 -69L127 -20L32 25Z" fill="url(#wood)" stroke="#c49c6e" stroke-width="3"/>
<path d="M-126 -24V64L33 108V25Z" fill="url(#wood)" stroke="#b68a58" stroke-width="2"/>
<path d="M33 25V108L127 60V-20Z" fill="#2b1912" stroke="#b58e5c" stroke-width="2"/>
<path d="M-107 -22L-30 -56L107 -18L30 14Z" fill="none" stroke="#d1ad78" stroke-width="2"/>
<path d="M-112 -5V54L25 90V35" fill="none" stroke="#b79062" stroke-width="1" opacity=".7"/>
<path d="M-104 11L-4 45M-109 29L-12 64M60 43L113 17" stroke="#b77b4e" stroke-width="1" opacity=".35"/>
<rect x="-4" y="38" width="28" height="18" rx="2" fill="url(#metal)" transform="skewY(15)"/>
<circle cx="10" cy="48" r="4" fill="#2b2017"/>
</g>''',
'ashtray':'''<g transform="translate(211 187)">
<ellipse cx="0" cy="32" rx="128" ry="79" fill="url(#metal)" stroke="#eccb90" stroke-width="3"/>
<ellipse cx="0" cy="18" rx="108" ry="61" fill="url(#black)" stroke="#8b6439" stroke-width="4"/>
<ellipse cx="0" cy="13" rx="83" ry="38" fill="url(#inner)" stroke="#b28c59" stroke-width="2"/>
<path d="M-96 -8L-71 0L-53 -10M65 -10L86 -1L107 -11" fill="none" stroke="url(#metal)" stroke-width="10" stroke-linecap="round"/>
<path d="M-105 47C-50 101 61 96 110 46" fill="none" stroke="#e7c087" stroke-width="2" opacity=".9"/>
</g>''',
'case':'''<g transform="translate(205 179) rotate(-20)">
<rect x="-60" y="-123" width="122" height="237" rx="28" fill="url(#wood)" stroke="#b48c5d" stroke-width="3"/>
<rect x="-50" y="-113" width="102" height="217" rx="22" fill="#2b1c15" stroke="#956b44" stroke-width="2"/>
<path d="M-48 -25H49" stroke="#c7a378" stroke-width="4"/>
<path d="M-42 -20H42" stroke="#5d452e" stroke-width="2"/>
<rect x="-8" y="-16" width="16" height="23" rx="3" fill="url(#metal)"/>
<path d="M-44 -82v135M42 -82v135" stroke="#866041" stroke-width="1" opacity=".8"/>
<path d="M-37 80C-10 96 13 96 37 80" stroke="#b58d58" stroke-width="1" fill="none"/>
</g>''',
'set':'''<g transform="translate(143 198) rotate(-26)">
<rect x="-38" y="-85" width="75" height="160" rx="15" fill="url(#metal)" stroke="#e6c293" stroke-width="2"/><rect x="-30" y="-74" width="59" height="140" rx="8" fill="url(#black)" stroke="#9f7d53" stroke-width="2"/><rect x="-15" y="-94" width="30" height="13" rx="2" fill="url(#steel)"/>
</g><g transform="translate(260 182) rotate(19)"><rect x="-67" y="-42" width="134" height="88" rx="20" fill="url(#metal)" stroke="#f3d5a2" stroke-width="2"/><rect x="-53" y="-31" width="105" height="66" rx="13" fill="url(#black)"/><circle cx="-25" cy="3" r="21" fill="url(#steel)"/><circle cx="-25" cy="3" r="11" fill="#171512"/><circle cx="25" cy="3" r="21" fill="url(#steel)"/><circle cx="25" cy="3" r="11" fill="#171512"/></g>'''
}
for name,content in arts.items():
 (assets/(name+'.svg')).write_text(head+content+end,encoding='utf-8')
print('assets',len(arts))

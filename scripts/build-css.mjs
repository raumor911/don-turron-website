import fs from 'node:fs';
const root=new URL('../',import.meta.url);
// Same rules and cascade order as the original three blocking stylesheets.
fs.writeFileSync(new URL('site.css',root),['fonts.css','styles.css','premium.css','gallery.css'].map(p=>fs.readFileSync(new URL(p,root),'utf8')).join('\n'));
console.log('CSS combined without changing cascade order');

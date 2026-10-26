import assert from 'node:assert/strict';
import fs from 'node:fs';
const products=JSON.parse(fs.readFileSync(new URL('../knowledge/products.json',import.meta.url),'utf8'));
const sql=fs.readFileSync(new URL('../database/003_product_content.sql',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../api/catalog.js',import.meta.url),'utf8');
const browser=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
assert.equal(products.length,8);
assert.match(sql,/CREATE TABLE IF NOT EXISTS dt_product_content/);
for(const product of products){
  assert.ok(sql.includes(product.id),'Missing product in catalog SQL: '+product.id);
  assert.ok(sql.includes(product.description.replace(/\\/g,'\\\\').replace(/'/g,"''")),'Missing full description: '+product.id);
  for(const photo of product.images)assert.ok(sql.includes(photo.src),'Missing photograph: '+photo.src);
}
assert.ok(!/DROP TABLE|TRUNCATE TABLE|DELETE FROM|UPDATE dt_inventory/i.test(sql));
assert.ok(api.includes("process.env.DT_DB_NAME===expectedDatabase"));
assert.ok(api.includes('res.status(503)'));
assert.ok(api.includes('publication_status'));
assert.ok(browser.includes("fetch('/api/catalog'"));
console.log('8 productos; descripciones e imágenes SQL; lectura segura y degradación del cliente: OK');

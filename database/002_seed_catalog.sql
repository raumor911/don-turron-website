-- Don Turrón | Semilla inicial desde knowledge/products.json, corte 2026-10-26.
-- Idempotente y NO destructiva: no sobrescribe existencias ni precios editados.
-- Únicamente 8 productos y 12 variantes canónicas.
USE `u345974778_donturron`;
START TRANSACTION;

INSERT INTO dt_products (product_id,name,retail_price,currency,publication_status,launch_month) VALUES
 ('humidor-viaje-5-puros','Humidor de viaje para 5 puros',649.00,'MXN','listed',NULL),
 ('cenicero-mesa','Set portátil de cenicero y cortadores',549.00,'MXN','listed',NULL),
 ('estuche-viaje','Estuche porta puros con humidificador',299.00,'MXN','listed',NULL),
 ('estuche-kit-viaje','Estuche portátil para 4 a 8 puros',949.00,'MXN','listed',NULL),
 ('reposa-puros-plegable','Reposa puros plegable de acero inoxidable',189.00,'MXN','listed',NULL),
 ('cortador-v-geometrico','Cortapuros en V de metal con acabado geométrico',NULL,'MXN','coming_soon','2027-01'),
 ('encendedor-sarike-butano','Encendedor metálico Parike de doble llama',NULL,'MXN','coming_soon','2027-01'),
 ('encendedor-honest-punch','Encendedor HONEST de doble flama con cortador punch',NULL,'MXN','coming_soon','2027-01')
ON DUPLICATE KEY UPDATE product_id=product_id;

INSERT INTO dt_variants (sku,product_id,variant_key,variant_label,is_active) VALUES
 ('humidor-viaje-5-puros:default','humidor-viaje-5-puros','default','Única',1),
 ('cenicero-mesa:default','cenicero-mesa','default','Única',1),
 ('estuche-viaje:default','estuche-viaje','default','Única',1),
 ('estuche-kit-viaje:default','estuche-kit-viaje','default','Única',1),
 ('reposa-puros-plegable:plata','reposa-puros-plegable','plata','Plata',1),
 ('reposa-puros-plegable:negro','reposa-puros-plegable','negro','Negro',1),
 ('cortador-v-geometrico:plateado','cortador-v-geometrico','plateado','Plateado',1),
 ('cortador-v-geometrico:dorado','cortador-v-geometrico','dorado','Dorado',1),
 ('encendedor-sarike-butano:plata','encendedor-sarike-butano','plata','Plata',1),
 ('encendedor-sarike-butano:dorado','encendedor-sarike-butano','dorado','Dorado',1),
 ('encendedor-honest-punch:negro','encendedor-honest-punch','negro','Negro',1),
 ('encendedor-honest-punch:rojo','encendedor-honest-punch','rojo','Rojo',1)
ON DUPLICATE KEY UPDATE sku=sku;

INSERT INTO dt_inventory (sku,on_hand_qty,reserved_qty,stock_status) VALUES
 ('humidor-viaje-5-puros:default',NULL,0,'unknown'),
 ('cenicero-mesa:default',1,0,'recorded'),
 ('estuche-viaje:default',1,0,'recorded'),
 ('estuche-kit-viaje:default',1,0,'recorded'),
 ('reposa-puros-plegable:plata',2,0,'recorded'),
 ('reposa-puros-plegable:negro',1,0,'recorded'),
 ('cortador-v-geometrico:plateado',NULL,0,'unknown'),
 ('cortador-v-geometrico:dorado',NULL,0,'unknown'),
 ('encendedor-sarike-butano:plata',NULL,0,'unknown'),
 ('encendedor-sarike-butano:dorado',NULL,0,'unknown'),
 ('encendedor-honest-punch:negro',NULL,0,'unknown'),
 ('encendedor-honest-punch:rojo',NULL,0,'unknown')
ON DUPLICATE KEY UPDATE sku=sku;

-- Registro del saldo inicial de las cinco variantes con existencia documentada.
-- Si ya existe un movimiento de apertura, no repetirlo.
INSERT INTO dt_stock_movements (sku,movement_type,delta_qty,qty_before,qty_after,actor_ref,reference_ref,reason,idempotency_key)
SELECT 'cenicero-mesa:default','opening_balance',1,NULL,1,'catalog-import','knowledge/products.json','Saldo inicial documentado en catálogo; pendiente de conteo físico.','seed-v1:cenicero-mesa:default'
FROM dt_inventory WHERE sku='cenicero-mesa:default' AND on_hand_qty=1
ON DUPLICATE KEY UPDATE idempotency_key=idempotency_key;
INSERT INTO dt_stock_movements (sku,movement_type,delta_qty,qty_before,qty_after,actor_ref,reference_ref,reason,idempotency_key)
SELECT 'estuche-viaje:default','opening_balance',1,NULL,1,'catalog-import','knowledge/products.json','Saldo inicial documentado en catálogo; pendiente de conteo físico.','seed-v1:estuche-viaje:default'
FROM dt_inventory WHERE sku='estuche-viaje:default' AND on_hand_qty=1
ON DUPLICATE KEY UPDATE idempotency_key=idempotency_key;
INSERT INTO dt_stock_movements (sku,movement_type,delta_qty,qty_before,qty_after,actor_ref,reference_ref,reason,idempotency_key)
SELECT 'estuche-kit-viaje:default','opening_balance',1,NULL,1,'catalog-import','knowledge/products.json','Saldo inicial documentado en catálogo; pendiente de conteo físico.','seed-v1:estuche-kit-viaje:default'
FROM dt_inventory WHERE sku='estuche-kit-viaje:default' AND on_hand_qty=1
ON DUPLICATE KEY UPDATE idempotency_key=idempotency_key;
INSERT INTO dt_stock_movements (sku,movement_type,delta_qty,qty_before,qty_after,actor_ref,reference_ref,reason,idempotency_key)
SELECT 'reposa-puros-plegable:plata','opening_balance',2,NULL,2,'catalog-import','knowledge/products.json','Saldo inicial documentado en catálogo; pendiente de conteo físico.','seed-v1:reposa-puros-plegable:plata'
FROM dt_inventory WHERE sku='reposa-puros-plegable:plata' AND on_hand_qty=2
ON DUPLICATE KEY UPDATE idempotency_key=idempotency_key;
INSERT INTO dt_stock_movements (sku,movement_type,delta_qty,qty_before,qty_after,actor_ref,reference_ref,reason,idempotency_key)
SELECT 'reposa-puros-plegable:negro','opening_balance',1,NULL,1,'catalog-import','knowledge/products.json','Saldo inicial documentado en catálogo; pendiente de conteo físico.','seed-v1:reposa-puros-plegable:negro'
FROM dt_inventory WHERE sku='reposa-puros-plegable:negro' AND on_hand_qty=1
ON DUPLICATE KEY UPDATE idempotency_key=idempotency_key;

COMMIT;

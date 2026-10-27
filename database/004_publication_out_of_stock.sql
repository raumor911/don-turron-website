-- Don Turrón — agregar estado Out of stock a dt_products.
-- Ejecutar MANUALMENTE en la base de productos, tras verificar/respaldar dt_products.
-- No cambia los estados actuales ni modifica dt_inventory.
USE `u345974778_donturron`;

ALTER TABLE `dt_products`
  MODIFY COLUMN `publication_status`
    ENUM('listed','coming_soon','hidden','Out of stock')
    NOT NULL DEFAULT 'hidden';

-- Verificar los valores permitidos después de ejecutar:
SHOW COLUMNS FROM `dt_products` LIKE 'publication_status';

-- OPCIONAL: asignar el estado sólo al producto indicado.
-- Sustituir el ID por un product_id real y ejecutar exclusivamente cuando proceda:
-- UPDATE `dt_products`
-- SET `publication_status` = 'Out of stock'
-- WHERE `product_id` = 'ID_DEL_PRODUCTO';

-- Don Turrón | Inventario SQL v1 | 2026-10-26
-- DESTINO EXCLUSIVO: u345974778_donturron (Hostinger MySQL 8+ / MariaDB 10.6+).
-- APLICACIÓN MANUAL: respaldo previo -> 001_schema.sql -> 002_seed_catalog.sql.
-- NO ejecutar en la BD CRM de Kyberion. No contiene credenciales ni datos personales.
-- CREATE TABLE IF NOT EXISTS NO verifica estructuras anteriores: consultar SHOW CREATE TABLE.
USE `u345974778_donturron`;

CREATE TABLE IF NOT EXISTS dt_products (
  product_id VARCHAR(96) NOT NULL,
  name VARCHAR(200) NOT NULL,
  retail_price DECIMAL(12,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  publication_status ENUM('listed','coming_soon','hidden') NOT NULL DEFAULT 'hidden',
  launch_month CHAR(7) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (product_id),
  KEY idx_dt_products_publication (publication_status),
  CONSTRAINT chk_dt_products_price CHECK (retail_price IS NULL OR retail_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dt_variants (
  sku VARCHAR(160) NOT NULL,
  product_id VARCHAR(96) NOT NULL,
  variant_key VARCHAR(48) NOT NULL,
  variant_label VARCHAR(80) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (sku),
  UNIQUE KEY uq_dt_variant_product_key (product_id,variant_key),
  CONSTRAINT fk_dt_variant_product FOREIGN KEY (product_id)
    REFERENCES dt_products(product_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_dt_variant_active CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NULL indica existencia desconocida, jamás cero implícito.
-- reserved_qty solo deberá ser modificada por una operación transaccional del backend.
CREATE TABLE IF NOT EXISTS dt_inventory (
  sku VARCHAR(160) NOT NULL,
  on_hand_qty INT UNSIGNED NULL DEFAULT NULL,
  reserved_qty INT UNSIGNED NOT NULL DEFAULT 0,
  stock_status ENUM('unknown','recorded','counted') NOT NULL DEFAULT 'unknown',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  last_counted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (sku),
  CONSTRAINT fk_dt_inventory_variant FOREIGN KEY (sku)
    REFERENCES dt_variants(sku) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_dt_inventory_bounds CHECK (
    (on_hand_qty IS NULL AND reserved_qty = 0 AND stock_status = 'unknown')
    OR (on_hand_qty IS NOT NULL AND reserved_qty <= on_hand_qty AND stock_status IN ('recorded','counted'))
  ),
  CONSTRAINT chk_dt_inventory_version CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial append-only por contrato de aplicación; bloquear UPDATE/DELETE por permisos
-- de usuario de BD para el servicio operador cuando sea posible.
CREATE TABLE IF NOT EXISTS dt_stock_movements (
  movement_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku VARCHAR(160) NOT NULL,
  movement_type ENUM('opening_balance','receipt','sale','return','adjustment','write_off') NOT NULL,
  delta_qty INT NOT NULL,
  qty_before INT UNSIGNED NULL,
  qty_after INT UNSIGNED NOT NULL,
  actor_ref VARCHAR(100) NOT NULL,
  reference_ref VARCHAR(160) NULL,
  reason VARCHAR(500) NOT NULL,
  idempotency_key VARCHAR(191) NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (movement_id),
  UNIQUE KEY uq_dt_movement_idempotency (idempotency_key),
  KEY idx_dt_movement_sku_time (sku,occurred_at,movement_id),
  CONSTRAINT fk_dt_movement_variant FOREIGN KEY (sku)
    REFERENCES dt_variants(sku) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_dt_movement_balances CHECK (
    (qty_before IS NULL AND movement_type = 'opening_balance' AND delta_qty >= 0 AND qty_after = delta_qty)
    OR (qty_before IS NOT NULL AND (CAST(qty_before AS SIGNED) + delta_qty) = CAST(qty_after AS SIGNED))
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reservas preparadas para integración futura con WhatsApp/Kyberion.
-- En v1 no se crean reservas automáticamente cuando alguien agrega al carrito.
CREATE TABLE IF NOT EXISTS dt_reservations (
  reservation_id CHAR(36) NOT NULL,
  sku VARCHAR(160) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  status ENUM('active','fulfilled','cancelled','expired') NOT NULL DEFAULT 'active',
  external_ref VARCHAR(160) NULL,
  expires_at DATETIME(3) NULL,
  actor_ref VARCHAR(100) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (reservation_id),
  UNIQUE KEY uq_dt_reservation_external (external_ref),
  KEY idx_dt_reservation_sku_status (sku,status,expires_at),
  CONSTRAINT fk_dt_reservation_variant FOREIGN KEY (sku)
    REFERENCES dt_variants(sku) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_dt_reservation_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

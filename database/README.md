# Don Turrón — Base de datos de inventario v1

**Destino aprobado:** `u345974778_donturron` (MySQL/MariaDB en Hostinger). No utilizar la base del CRM Kyberion.

## Estado

Estas migraciones están versionadas como código. **No se ha comprobado acceso a phpMyAdmin ni ejecutado SQL en la base remota**. El despliegue del esquema requiere ejecutarlo en Hostinger y verificar sus resultados. Ningún archivo público `.js` contiene credenciales.

## Aplicación segura en Hostinger

1. Hacer copia de seguridad o exportación de la BD objetivo y confirmar que se ha seleccionado `u345974778_donturron`.
2. En **phpMyAdmin > SQL**, ejecutar `database/001_schema.sql`; revisar errores y que se hayan creado exactamente las cinco tablas `dt_products`, `dt_variants`, `dt_inventory`, `dt_stock_movements`, `dt_reservations`.
3. Ejecutar `database/002_seed_catalog.sql`. El seed es idempotente, respeta los datos ya existentes y jamás sustituye una cantidad real por el stock inicial.
4. Ejecutar los SELECT de validación siguientes y contrastar los resultados (sin exponer datos de usuarios ni claves):

```sql
USE `u345974778_donturron`;
SHOW TABLES LIKE 'dt_%';
SELECT COUNT(*) AS products FROM dt_products; -- 8
SELECT COUNT(*) AS variants FROM dt_variants; -- 12
SELECT COUNT(*) AS with_known_stock, SUM(on_hand_qty) AS known_units
FROM dt_inventory WHERE on_hand_qty IS NOT NULL; -- 5 variantes, 6 unidades
SELECT sku,on_hand_qty,reserved_qty,stock_status FROM dt_inventory ORDER BY sku;
SELECT COUNT(*) AS initial_movements FROM dt_stock_movements; -- 5 si BD nueva
SELECT COUNT(*) AS reservations FROM dt_reservations; -- 0 si BD nueva
```

## Reglas de integridad

- Las claves de productos son **exactamente** las de `knowledge/products.json`, utilizadas por el catálogo y WhatsApp.
- SKU `product-id:default` para producto sin colores y `product-id:plata`/etc. para variantes.
- `on_hand_qty=NULL` significa **desconocido**, no agotado ni existencia cero; se mantiene para humidor y artículos anunciados para enero 2027. No publicar una cantidad de stock inventada.
- Inventario registrado en el catálogo: cenicero 1, estuche de 6 puros 1, estuche portátil 4–8 puros 1, reposa puros plata 2 y negro 1. La etiqueta `recorded` representa un saldo documentado, no un conteo físico.
- `on_hand_qty=0` solamente tras confirmación real de agotado. `available_qty=on_hand_qty-reserved_qty` solo si `on_hand_qty IS NOT NULL`.
- Precio se almacena para consulta administrativa; publicar precio u ofertas en buscadores sigue gobernado por el Semantic Core y la política de publicación, no por esta BD.
- No modificar directamente `on_hand_qty` desde frontend. Operaciones futuras deben usar transacción, `SELECT ... FOR UPDATE`, comprobar existencias y reservas, aplicar el movimiento auditable y confirmar `COMMIT` en conjunto.
- Una selección en carrito o un mensaje de WhatsApp **no reserva** stock.
- Los movimientos históricos no deben editarse o eliminarse mediante el usuario de aplicación. Conservar respaldo antes de cualquier migración.

## Conexión Kyberion → BD de Don Turrón

Kyberion usa `mysql2/promise`; su pool CRM actual apunta a **otra base**. La integración necesita un **segundo pool de servidor** con `DT_DB_HOST`, `DT_DB_PORT`, `DT_DB_USER`, `DT_DB_PASSWORD`, `DT_DB_NAME=u345974778_donturron`. Estas credenciales se configuran **solo en el servidor**, nunca en `config.js`, navegador o repositorio.

El siguiente módulo administrará movimientos en Kyberion con sesión y autorización. Don Turrón consultará una API HTTPS de solo lectura que retornará `product_id`, `variant_key`, `available_qty` y `availability_status` (unknown, available, sold_out o coming_soon), sin exponer tablas ni datos privados. La API no debe bloquear la carga visual del sitio; si falla, mostrar «Confirmar disponibilidad», no declarar disponibilidad errónea.

**Pendiente para considerar activa la conexión:** ejecución de SQL en Hostinger, alta de usuario MySQL con permisos mínimos, variables secretas en Kyberion, endpoints autenticados de escritura y públicos restringidos de lectura, despliegue, pruebas de stock concurrente y consumo del endpoint en Don Turrón. No se ha establecido conexión de producción con los archivos SQL por sí solos.

## Ampliación v1.1: información de cada producto y API Vercel

La migración inicial (001,002) solo tenía `dt_products` (nombre, precio, estado), variantes y cantidades; **no incluía el texto completo o las fotografías**. Ejecutar en la MISMA BD y después del 001/002:

- `database/003_product_content.sql`: agrega `dt_product_content` con categoría, subtítulo, descripción, características (JSON), fotografías locales (JSON), etiqueta, marca y orden de catálogo. La semilla usa los ocho registros verificables de `knowledge/products.json`, sin alterar ediciones futuras.
- Comprobar `SELECT COUNT(*) FROM dt_product_content;` (resultado esperado: **8**) y revisar `SELECT p.product_id,p.name,c.subtitle,c.description,c.features_json,c.images_json FROM dt_products p JOIN dt_product_content c USING(product_id);`.
- Los textos, fotografías y precios quedan ahora gobernados por la BD **para las tarjetas con JavaScript**, una vez habilitada la conexión. Los archivos estáticos del Semantic Core continúan como snapshot editorial accesible sin JavaScript y para buscadores. **Cambiar datos en MySQL no actualiza automáticamente sitemap, HTML prerenderizado, archivos AI/LLMO o páginas individuales**: requieren una futura sincronización editorial versionada.

### Configuración Vercel (solo en el servidor)

El proyecto Vercel reconocido es `don-turron-website`, con dominio `www.donturron.com.mx`. Definir en **Settings → Environment Variables → Production**:

| Nombre | Valor |
|---|---|
| `DT_DB_NAME` | `u345974778_donturron` |
| `DT_DB_HOST` | hostname externo MySQL provisto por Hostinger (no `localhost`) |
| `DT_DB_PORT` | `3306` o puerto remoto real |
| `DT_DB_USER` | usuario SQL con **SELECT exclusivo** en tablas `dt_%` |
| `DT_DB_PASSWORD` | contraseña de ese usuario, tipo **Sensitive/Encrypted**, nunca en Git |

No reutilizar las variables `DB_*` existentes para telemetría: no hay confirmación de que apunten a la base del catálogo. En Hostinger es necesario habilitar MySQL remoto para un origen autorizado; preferir IP fija/salida controlada. **No abrir acceso remoto a cualquier IP (%) sin revisión de seguridad**; si no se puede conectar por una ruta segura, alojar un gateway autenticado/HTTPS junto a la BD.

Tras ejecutar 003 y configurar secretos, probar `https://www.donturron.com.mx/api/catalog` (200, 8 productos, `source=don-turron-inventory`, sin datos internos), y verificar disponibilidad/colores/precios en móvil. Solo entonces cambiar `config.js` a `liveCatalogEnabled:true` y desplegar. Antes de ese gate, el sitio conserva el HTML y las interacciones actuales sin consultar MySQL.

La API `api/catalog.js` solo permite GET; no publica contraseñas, datos de clientes ni SQL. Con el gate activo, si falla la BD, el navegador sustituye existencias y precios por estado «por confirmar», sin afirmar disponibilidad desactualizada. El carrito WhatsApp no aparta productos. Para gestión operativa desde Kyberion, desarrollar posteriormente un backend de escritura con permisos, transacciones e historial `dt_stock_movements`.

**Verificación actual:** migración 003 y servidor de API preparados en código, **no ejecutados ni conectados a BD remota**; el gate está desactivado hasta completar estas condiciones.

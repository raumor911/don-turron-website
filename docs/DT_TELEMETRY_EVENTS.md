# DT Telemetry V1 — Eventos disponibles

## Crawler (solicitudes HTTP)
Detección por User-Agent declarado, no verificación de proveedor. `crawler_name`, `crawler_family`, `crawler_purpose`, `detection_method='user_agent'`, `verification_status='claimed'`. Solo GET/HEAD y rutas públicas documentadas en el manifiesto semántico, con status HTTP realmente observado, incluido 404/500. Sin supresión temporal de duplicados.

`page_type`: `brand_home`, `brand_identity` (secciones de identidad), `product_collection`, `product_detail`, `semantic_resource`, `system_robots`, `system_sitemap`, `system_llms`, `unmapped_resource` (no almacenada cuando la ruta no sea elegible). Los campos `product_id`, `category_id`, `semantic_intent` y `resource_type` se derivan de `knowledge/products.json`, `knowledge/intents.json` y `ai/content-manifest.json`, nunca de la cadena del navegador. El encendedor es conceptual y carece de URL de producto comercial.

## Navegador — POST /api/telemetry
`page_view` (vista real tras activar cliente), `section_view` (IntersectionObserver), `product_view` (apertura efectiva de ficha), `gallery_navigation` (cambio real de imagen), `image_zoom` (apertura del visor o cambio de zoom), `category_filter` (filtro efectivamente cambiado), `selection_add` y `selection_remove` (después del cambio), `selection_open` (apertura), `selection_copy` (solo si se copió), `contact_click` (activación de enlace de contacto real).

Se envían únicamente UUIDs anónimos de sesión, evento, ruta sin query, tipo de dispositivo y campos permitidos: `product_id`, `filter`, `image_index`, `zoomed`, `section`. No se transmiten nombres, correos, teléfonos, mensajes, contenido de selección, edad ni destino exacto de enlaces. Los UUIDs de cliente se almacenan solo en `sessionStorage`, con rotación por 30 minutos de inactividad y se transforman en IDs con namespace propio en backend.

Si `DNT=1` o Global Privacy Control está activo, el cliente se abstiene; no modifica la UI. Nunca se utiliza la telemetría humana para detectar robots. Una ausencia de endpoint no impide navegación.

## Estados de activación
`disabled` por defecto, `configured` cuando están las variables, `schema_verified` únicamente tras SHOW COLUMNS/INDEX reales, `db_connected` tras prueba de servidor y grants. El importador y el cliente comparten el mismo contrato normalizado aunque usan canales y tablas diferentes.

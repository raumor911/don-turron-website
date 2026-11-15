# Incidente: catálogo aprobado en GitHub no aparece en Hostinger

## Diagnóstico técnico

El build determinista genera las fichas y precios desde `knowledge/products.json`, pero la aplicación de producción no sirve ese HTML directamente. `server.js` responde la portada, las fichas y las rutas semánticas **desde una consulta al catálogo MySQL**. `/api/catalog` devuelve la misma fuente, y `app.js` vuelve a hidratar el catálogo con esos registros.

El catálogo histórico de la base seguía considerando tres artículos como `coming_soon`, con precio nulo y fecha futura. Por eso un `git merge` correcto y un `npm run build` satisfactorio **no actualizan lo visible si la fuente dinámica continúa con registros antiguos**. No es un problema de caché del navegador.

Existe un segundo defecto: la hidratación del navegador desechaba `status: available/unavailable` de las variantes cuando no había una cantidad numérica. Eso podía volver a marcar como pendiente una disponibilidad comercial aprobada.

## Reparación de la fuente de verdad, limitada a tres productos

Se añadió una conciliación de publicación en `api/catalog-release.js`, utilizada por `readCatalogSnapshot()` **antes de calcular el ETag**. El catálogo versionado en GitHub es el origen aprobado de **precio al público, nombres, fotos, descripciones y acabados** exclusivamente para:

- `cortador-v-geometrico` — $479 MXN, IVA incluido; plateado y dorado disponibles
- `encendedor-sarike-butano` (nombre público Parike) — $719 MXN, IVA incluido; plata bloqueada y dorado disponible
- `encendedor-honest-punch` — $489 MXN, IVA incluido; negro y rojo disponibles

**No se modifican los otros cinco precios.** Los identificadores internos permanecen compatibles.

La base de datos conserva el control sobre:
- Productos retirados/ocultos (no se reviven si la consulta no los devuelve).
- Estado general `Out of stock`, que prevalece sobre la aprobación editorial.
- Existencias numéricas comprobadas: un cero bloquea el acabado, los valores positivos se respetan.
- Productos fuera de los tres identificadores anteriores, incluidos los futuros.

La declaración «disponible» sin cantidad registrada permite incluir el producto en la **selección de consulta por WhatsApp**; no inventa piezas ni reserva inventario. La plata de Parike está bloqueada aunque los registros antiguos difieran.

La portada SSR, `/api/catalog`, `/catalog.js`, las fichas, los metadatos y la proyección LLMO utilizan la misma conciliación; el cliente preserva las variantes `available/unavailable` sin reemplazarlas por `pending_confirmation` cuando no existe conteo.

## Control de calidad y entrega

Ejecutar `npm run build`, `npm run test:catalog-release`, `npm run test:inventory` y `npm run test:hostinger`. La prueba de regresión simula exactamente el dato antiguo (tres próximos lanzamientos con precio nulo), verifica los nuevos precios y el bloqueo de plata, y confirma que los demás registros no sufren modificaciones.

Después de actualizar la rama `main` en Hostinger y reconstruir/reiniciar Express, comprobar desde la página pública la portada, las tres fichas, `/api/catalog`, `/ai/products.json` y la selección de acabados. Si Hostinger continúa ejecutando una revisión anterior, primero resolver su vínculo Git o reiniciar/redeploy: este código sólo actúa en el proceso actualizado.

Esta solución **no escribe en MySQL ni modifica credenciales**. En una fase posterior, la operación comercial deberá decidir entre centralizar la gestión editorial en GitHub o introducir un proceso de aprobación y sincronización a MySQL. Evitar eliminar la conciliación hasta tener una ruta de actualización equivalente y probada.

## Límites

Esta reparación no comprueba físicamente inventarios ni procesa pagos. Sin acceso operativo al panel de Hostinger no se puede certificar cuál commit está ejecutando producción.

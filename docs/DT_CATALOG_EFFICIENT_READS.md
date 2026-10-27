# Don Turrón — Consumo eficiente del catálogo MySQL

## Objetivo

La fuente de verdad permanece en la base `u345974778_donturron` de Hostinger. El servidor Express utiliza exclusivamente las variables `DT_DB_*` y la conexión MySQL existente (incluido `127.0.0.1` cuando aplica). La telemetría `DB_*`/`TELEMETRY_*` no se modifica.

## Estrategia de bajo riesgo

- **Una única consulta SELECT existente**, con `mysql2` y pool ya limitado a dos conexiones. Sin migraciones, escrituras, cron ni dependencias adicionales.
- **Snapshot en memoria de cinco segundos** por proceso Node.js. Durante esa ventana, numerosas visitas reutilizan la misma respuesta sin nuevas consultas MySQL.
- **Single-flight**: cuando expira la ventana, solicitudes simultáneas comparten una sola consulta. Esto reduce picos de concurrencia sobre Hostinger.
- **Reintento moderado**: tras fallar MySQL, se rechazan solicitudes de esa ventana durante un segundo sin reconectar continuamente. No se publican cantidades de inventario de un snapshot vencido.
- **Caché HTTP de cinco segundos** (`Cache-Control: public, max-age=5, s-maxage=5, must-revalidate`). El navegador reutiliza datos muy recientes; después puede revalidarlos. La respuesta incluye `ETag` SHA-256 para permitir HTTP **304** cuando no hay cambios, sin volver a transferir el JSON.
- **Carga no bloqueante**: el HTML y las tarjetas iniciales siguen llegando sin esperar a la BD. El timeout de hidratación pasa de 2.6 a 5.5 segundos sólo para admitir cargas frías; no bloquea la página.
- **Fallo controlado**: si MySQL falla, `/api/catalog` responde 503, las tarjetas quedan en estado por confirmar y el sitio continúa respondiendo 200.

### Frescura y límites

El desfase típico tras cambiar precios/existencias es de pocos segundos. Con dos capas independientes de caché de hasta cinco segundos cada una, en condiciones normales puede haber **alrededor de diez segundos** entre actualizar MySQL y que todas las visitas nuevas vean el valor. Las pestañas abiertas no consultan de forma continua; necesitan recargar para obtener cambios. Los cambios en MySQL **no actualizan** automáticamente el HTML prerenderizado ni la capa SEO/LLMO.

Este catálogo es una **selección por WhatsApp, sin reservar stock**. Si se implementan ventas y reservas en tiempo real, las operaciones de confirmación deberán validar existencias en la BD dentro de una transacción, nunca basándose en respuestas cacheadas.

### Verificación

```bash
npm install
npm run build
node --test tests/catalog-cache.test.mjs
npm run test:hostinger
npm run test:inventory
npm start
```

En Hostinger:

1. Comprobar `/api/healthz` = 200 y `/api/catalog` = 200.
2. Hacer dos peticiones sucesivas al catálogo. Deben devolver `ETag` y `Cache-Control`, reutilizando caché breve.
3. Con una petición condicional `If-None-Match` con el ETag anterior, esperar `304` si no hubo cambios.
4. Editar una existencia o precio en MySQL y revisar de nuevo pasado el TTL; no se necesita recompilar ni desplegar.
5. Confirmar que `/api/telemetry/config`, `robots.txt`, sitemap y fichas de productos mantienen su comportamiento.

La caché es local al proceso. Si Hostinger ejecuta más de una instancia de Node.js, cada una mantiene su TTL independiente. **No se instala Redis ni se añaden servicios externos.**

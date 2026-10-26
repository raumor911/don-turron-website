# DT-SC-003 — SEO / release gates

## Estado vigente: producción

El usuario confirmó la operación comercial digital. Vercel confirma `www.donturron.com.mx` como dominio de producción verificado y redirección 308 del apex. `semantic-release.json` habilita indexación; `release.mjs` genera `index, follow`, canonical y og:url absolutos, y referencias JSON-LD bajo ese origen. El compilador genera robots y sitemap con portada, ocho productos y una guía. No hay URLs de vista previa en el sitemap.

Las fuentes de contenido siguen siendo `knowledge/*.json`; no editar manualmente catálogo, fichas ni AI. Ejecutar `npm run build:semantic`, verificar salida determinista y las pruebas antes de integrar. `release.test.mjs` y `verify.mjs` comprueban las compuertas y la ausencia de Offers, InStock, reviews y ratings.

`enableCommerce=false` describe la ausencia de checkout integrado; no bloquea la coordinación comercial por WhatsApp. `publishOffers=false` e `indexNow=false` se conservan porque publicación no valida inventario ni implementa estos servicios. Telemetría no se activa sin endpoint y backend comprobados. No se afirma registro en Search Console, inclusión en buscadores o recomendaciones de asistentes.

La rama main está conectada a despliegue Git de Vercel. Un merge puede publicar automáticamente. No se ejecuta despliegue explícito. Tras el merge se debe confirmar el SHA del despliegue y revisar el contenido público y las mediciones.

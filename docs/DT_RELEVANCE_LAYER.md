# DT-SC-003 — Relevance / Intent Layer

Cada `knowledge/intents.json` vincula expresiones *hipotéticas*, necesidades y productos documentados. No hay métricas de demanda verificadas. El compilador restringe páginas individuales a los cinco productos con `contentStatus: documented` y genera una sola guía respaldada por respuesta canónica: `/guia/estuche-o-humidor/`.

Los enlaces recomendados se determinan mediante:
- Coincidencia de caso de uso (3 puntos por cada caso compartido).
- Misma categoría (2 puntos).
- Máximo 3 recomendaciones por página; excluir artículo actual y conceptual.
- Desempate alfabético estable, sin random ni datos de seguimiento.
- Sin generación masiva de URLs a partir de intenciones con insuficiente contenido.

La identidad de marca permanece independiente de su primera colección y sus futuras expansiones no requieren rehacer el grafo raíz. No se han creado rutas comerciales del encendedor conceptual.

Prerender: `index.html` incluye seis tarjetas informativas estáticas (con datos textuales recuperables sin JavaScript). Cuando JavaScript ejecuta `renderProducts()`, el mismo contenedor se reemplaza por el catálogo generado: no hay dos grillas. Las cinco fichas tienen H1, descripción, características, imágenes, aclaraciones, enlaces, title, metadescription y JSON-LD sin `Offer`. Las rutas estáticas `productos/<id>/index.html` pueden requerir habilitar directory index en el hosting; validar acceso directo antes de lanzamiento.

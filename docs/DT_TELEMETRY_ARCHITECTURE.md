# DT Telemetry V1 — arquitectura y fase DT-TEL-001

## Inspección y decisión
`don-turron-website/main` sigue siendo HTML/CSS/JS estático, sin Express ni servidor propio. `feat/dt-semantic-core-v1` (PR #4) está abierto, no fusionado. Las referencias `erika-morales-sitio-profesional`, `allisson-garcia-sitio-profesional` y `rauvia-platform` se consultaron en modo solo lectura. Allison aporta protección de esquema y namespace, pero su integración en MySQL tampoco acredita validación contra el servidor real. RAUVIA utiliza caché de duplicados de 60 s que aquí **no se reproduce**.

**Mecanismo elegido:** importador de logs HTTP del hosting/CDN, por ser una web estática. No se añade Express ni se interceptan solicitudes en JavaScript. Un receptor Node nativo separado, opcional, servirá únicamente `/api/telemetry` y `/api/telemetry/config` cuando exista un reverse proxy confiable. Su activación requiere configuración explícita. El importador registra el código HTTP real y no altera respuestas.

## Dependencia semántica
La rama toma una **copia byte-a-byte de tres fuentes generadas por DT Semantic Core PR #4** (`knowledge/products.json`, `knowledge/intents.json`, `ai/content-manifest.json`) exclusivamente para compilar y probar su clasificador antes de que PR #4 entre a `main`. **No mantener un catálogo secundario**: `telemetry/semantic.mjs` lee dichos archivos como entrada, y fallará de forma controlada ante ausencias o inconsistencias. Para integración, fusionar PR #4 primero y actualizar la rama de telemetría; las copias comunes deberán desaparecer del diff.

## Detección
Googlebot, bingbot, OAI-SearchBot, GPTBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Applebot, Meta-ExternalAgent y fallback genérico. El valor `verification_status: claimed` identifica únicamente la declaración HTTP. Google-Extended es token de robots, no se reconoce como robot autónomo. No se atribuyen recomendaciones ni conversiones a agentes AI.

## Datos
`site_id=don-turron` constante del lado servidor; no se toma de parámetros o logs. Rutas normalizadas sin query ni fragment. Solamente GET/HEAD de páginas reales, 404 del sitemap, robots/llms/ai reconocidos por manifiesto. Cero IP en DB, `ip_hash=NULL`; referer nulo. Tiempo UTC y duración opcional. Sin deduplicación artificial.

## Persistencia
Pool de 3, cola de 30, timeout 3 s y backoff 30 s. `TELEMETRY_ENABLED=false` y `TELEMETRY_WRITE_APPROVED=false` por defecto. No se ejecuta DDL. Las cuatro tablas deben pasar `SHOW COLUMNS` y `SHOW INDEX` antes de habilitar INSERT, más revisión de grants. Cualquier incompatibilidad bloquea escrituras; los errores internos no exponen credenciales.

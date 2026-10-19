# DT Telemetry V1 — Evidencia QA y limitaciones

- `node --test telemetry/tests.mjs telemetry/receiver.test.mjs`: crawler Googlebot, Bingbot, OAI-SearchBot, GPTBot, Claude, unknown/generic; todos `claimed`, nunca `verified`; clasificación de páginas/productos y recursos manifest; GET/HEAD, 404, 500; sanitización, ausencia de IP/queries, no deduplicación, site_id inmutable, control de tablas/índices, saturación de cola, backoff y fallo MySQL, 3 INSERTs humanos simulados y control de origen del receptor.
- `python tests/qa_browser.py`: escritorio 1440×900 y móvil 390×844, filtros, selección, galerías y zoom existentes; intercepta eventos `dt:interaction` al abrir ficha, filtrar, seleccionar y navegar fotos. Cliente deshabilitado falla silenciosamente sin interrumpir pruebas.
- `node --check`: cliente y módulos Node. Toda CI se ejecuta sin credenciales MySQL reales.
- No guardar capturas de pruebas en repositorio.
- Evidencia de integración productiva: **NO**; se requiere comprobar estructura real, grants, retención, un INSERT de prueba con `test_run=true`, SELECT confirmatorio, aislamiento de otros sites y desactivación posterior.
- El receptor es opcional y está desacoplado: en despliegues puramente estáticos la telemetría humana permanece deshabilitada.

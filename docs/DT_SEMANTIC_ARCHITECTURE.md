# DT Semantic Intelligence Layer V1 — Arquitectura

Referencia: Semantic Core v2 de Creativos Espacios (solo lectura). Se adoptan principios de entidades, referencias, claims, fuentes, huella de conocimiento y generación determinista; **no** se traslada React/Vite ni la arquitectura de ventas de contenedores.

Ruta: `knowledge/*.json` → `scripts/dt-semantic/validate.mjs` → `scripts/dt-semantic/compile.mjs` → `catalog.js`, marcado JSON-LD, `/ai/*`, `/llms.txt` y `/llms-full.txt`. La fase 003 incorpora rutas estáticas para cinco productos y relevancia por intención.

La marca es independiente de la colección. Las características del proveedor conservan su etiqueta `supplier_declared`; no existen `Offer`, `InStock` ni valoraciones inventadas. No se emiten URLs absolutas sin dominio. La huella es SHA-256 de todos los documentos normalizados del Semantic Core, sin `generatedAt`, por lo que builds iguales producen artefactos idénticos.

Desarrollo: `npm run validate:knowledge`, `npm run build:semantic`. Node >=20; cero dependencias adicionales. Los activos semánticos se generan localmente y quedan versionados mediante el workflow del branch, nunca desplegados a producción automáticamente.

El acceso a `/ai/*` durante el prelanzamiento sigue bloqueado para rastreo por `robots.txt` y `noindex`. Los recursos sirven para QA y publicación futura, no para forzar visibilidad ni respuestas de asistentes.

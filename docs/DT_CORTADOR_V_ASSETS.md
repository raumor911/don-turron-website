# DT-CUTTER-V-001 — Fotografía / control de integración

Estado: **LOS CINCO WEBP ESTÁN SUBIDOS EN LA RAMA feat/dt-cortador-v-product**. Queda pendiente la compilación y validación integral antes de autorizar fusión. No hay despliegue a producción.

Los siguientes archivos fueron preparados a 1080×1080 con ajuste `contain` y fondo exterior de la paleta Don Turrón; el contenido fotográfico original, mecanismo, dimensiones y texturas no se modificó. El fondo oscuro original de las vistas editoriales era adecuado y se conservó; la lámina técnica mantiene su contraste legible.

Archivos verificados contra las fuentes locales y subidos a `assets/products/` en el commit [`a497eb5`](https://github.com/raumor911/don-turron-website/commit/a497eb546a2b83787a887352b83455d772701c89), con estos nombres:

| Archivo | SHA-256 esperado |
|---|---|
| `cortador-v-plateado.webp` | `add107d8c4be50d52799d159896c9ed5c9cf3d49ce95e241d638821d5acf4726` |
| `cortador-v-dorado.webp` | `8a91130a97fa6390117966182ea9c35569df1b2a15706cca073eefc7a0a7abe7` |
| `cortador-v-medidas.webp` | `eb0d34eb7f3c14ec741f44667b14953118e1485ebd8a0a940f15c72ad42017d8` |
| `cortador-v-mecanismo.webp` | `a79f270feb6e1f9870ad4f082978cda4617b7a047e4a9c695e3825a7550390ee` |
| `cortador-v-uso.webp` | `1e9a657e8915469fa842745e5d6e08334b506afbe674a0eec224e541b70b48b4` |

Se verificó que los identificadores Git SHA-1 de los cinco blobs remotos coinciden con `git hash-object` de los archivos WebP locales. La comprobación de integridad SHA-256 sigue siendo la tabla precedente.

**Siguiente fase:** `npm run build:semantic` para actualizar catálogo, grafo, JSON-LD, fichas estáticas y recursos LLMO; ejecutar QA escritorio, móvil y sin JavaScript. El PR #5 de telemetría mantiene una validación de seis IDs y requiere reconciliación antes de ser fusionado. Conservar `noindex`, `robots.txt`, sin precios, stock ni despliegue automático.

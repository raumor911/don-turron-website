# DT-CUTTER-V-001 — Fotografía / control de integración

Estado: **BLOQUEADO: FALTAN CINCO ACTIVOS WEBP EN GITHUB**. La rama incluye la definición del producto y el Semantic Core actualizado, pero todavía no debe fusionarse ni desplegarse porque el repositorio remoto carece de los archivos binarios adjuntos por el usuario.

Los siguientes archivos fueron preparados a 1080×1080 con ajuste `contain` y fondo exterior de la paleta Don Turrón; el contenido fotográfico original, mecanismo, dimensiones y texturas no se modificó. El fondo oscuro original de las vistas editoriales era adecuado y se conservó; la lámina técnica mantiene su contraste legible.

Copiar los cinco archivos desde el archivo `Don-Turron-Cortador-V-Galeria.zip` de la entrega de ChatGPT a la carpeta `assets/products/` **de esta rama**, con exactamente estos nombres:

| Archivo | SHA-256 esperado |
|---|---|
| `cortador-v-plateado.webp` | `add107d8c4be50d52799d159896c9ed5c9cf3d49ce95e241d638821d5acf4726` |
| `cortador-v-dorado.webp` | `8a91130a97fa6390117966182ea9c35569df1b2a15706cca073eefc7a0a7abe7` |
| `cortador-v-medidas.webp` | `eb0d34eb7f3c14ec741f44667b14953118e1485ebd8a0a940f15c72ad42017d8` |
| `cortador-v-mecanismo.webp` | `a79f270feb6e1f9870ad4f082978cda4617b7a047e4a9c695e3825a7550390ee` |
| `cortador-v-uso.webp` | `1e9a657e8915469fa842745e5d6e08334b506afbe674a0eec224e541b70b48b4` |

Tras confirmar los cinco archivos: `npm run build:semantic` para regenerar catálogo, grafo, JSON-LD, fichas estáticas y llms; comprobar siete tarjetas y seis fichas documentadas; ejecutar QA desktop/móvil y sin JavaScript. Revisar la dependencia de DT Telemetry PR #5 que contiene una validación de seis IDs y debe reconciliarse con siete antes de fusionar telemetría. Mantener `noindex`, `robots.txt`, sin precio/inventario y sin despliegue automático.

No sustituir las fotos con imágenes sintéticas que modifiquen el cortador ni con fotos de productos distintos. No generar páginas adicionales aparte de las rutas individuales permitidas por Semantic Core.

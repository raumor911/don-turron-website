# V4 — Visor fotográfico completo en Don Turrón

## Problema corregido
Las fotografías originales se recortaban por `object-fit: cover` en el modal y en las tarjetas. Las láminas técnicas perdían las medidas y el encuadre real.

## Solución
- Visor modal con `object-fit: contain` para mostrar la fotografía completa, respetando proporciones y márgenes.
- Tarjetas y miniaturas de selección muestran las fotos completas sin recortarlas.
- Flechas anterior/siguiente (navegación circular) en las fichas con más de una fotografía, manteniendo la botonera numerada.
- Clic o toque sobre la fotografía para abrir el visor ampliado; cerrar, avanzar/retroceder, alternar zoom y consultar descripción.
- Navegación con flechas del teclado y Escape; control de foco y etiquetas accesibles.
- Respeta preferencias de movimiento reducido. No altera las imágenes, productos, IDs, estado de inventario ni flujo comercial.

## Implementación
Archivos nuevos `gallery.css` y `gallery.js`, cargados después de la hoja premium y la lógica existente. El script mejora progresivamente el contenido del modal generado por `app.js` usando un observador de mutaciones. No sustituye `photosOf`, no crea catálogos paralelos y reutiliza el mecanismo de selección de fotografías del producto.

## Pruebas
`tests/qa_browser.py` comprueba los seis artículos, incluyendo la referencia conceptual del encendedor, en escritorio y móvil: fit, flechas, navegación circular y por teclado, lightbox, zoom y Escape. El workflow de Actions ejecuta sintaxis JavaScript y QA automatizado. No sustituye una revisión visual final en dispositivos físicos.

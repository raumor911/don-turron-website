# Don Turrón | Atelier Motion V2

## Dirección creativa
La distinción no hace ruido. El movimiento expresa precisión y prestigio: la tipografía entra con cadencia editorial, el oro responde a la luz, y las piezas reciben protagonismo sin efectos recargados. Inspiración en códigos clásicos del lujo, sin copiar interfaces ni materiales de otras marcas.

## Experiencia implementada
- **Llegada:** entrada escalonada del manifiesto, iluminación controlada y subrayado fino del titular.
- **Exploración:** progreso de lectura dorado, entradas de sección al recorrer la página, transiciones y subrayados en navegación.
- **Colección:** reflejo puntual con puntero fino, mosaicos e íconos que reaccionan, elevación leve de tarjetas y presentación escalonada al filtrar.
- **Selección:** realimentación en el contador, diálogo de detalle y panel lateral con movimientos de baja amplitud.
- **Accesibilidad:** controles por teclado y toque intactos; preferencia del sistema de movimiento reducido respetada. Un control adicional en el pie permite desactivar animaciones.
- **Tecnología:** CSS y JavaScript sin dependencias nuevas; variables CSS y animaciones de transform/opacity, requestAnimationFrame para progresión y puntero, IntersectionObserver para apariciones y MutationObserver sólo para tarjetas regeneradas/contador.

## Límites
El contenido nunca depende de completar una animación: es visible incluso sin JavaScript y en capturas de página completa. Las categorías y productos permanecen conceptuales. No se activan inventario, precios, checkout ni pagos. El noindex de preproducción se conserva.

## Verificación
Pruebas locales con Playwright: 1440x900 y 390x844; filtros, selección, cantidades, detalle, drawer, menú móvil, control de movimiento y ausencia de errores JavaScript y desbordamiento horizontal. Validaciones de Node --check de app.js, premium.js, catalog.js y config.js ejecutadas antes de publicar.

Documentación de dirección de arte e interacción, no una medición empírica de conversión.

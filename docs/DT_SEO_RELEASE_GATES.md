# DT-SC-003 — SEO / release gates

## Estado presente
**PRELANZAMIENTO.** Permanecen `meta robots=noindex,nofollow` en portada, fichas y guía, y `robots.txt` con `Disallow: /`. No se publica sitemap.xml ni URL canónica absoluta y no se ejecuta IndexNow. Los archivos `/ai/` se generan por razones de integridad, sin afirmar indexación o recomendaciones.

## Condiciones para permitir publicación
1. Identidad comercial y dominio HTTPS auténtico confirmados y controlados.
2. Publicación y existencia de imágenes, fichas y políticas de privacidad/compra legalmente revisadas.
3. Precios, inventario, variantes, impuestos, envíos, cambios y métodos de pago confirmados, si se habilita venta.
4. Revisión regulatoria para accesorios asociados al consumo de tabaco, y de las políticas del buscador/plataforma.
5. Revisión de declaraciones `supplier_declared` y comprobación de claims; retirar cualquier prestación no sustentada.
6. Cambiar una compuerta explícita de publicación en la futura configuración de despliegue y configurar el dominio real; solo entonces generar sitemap.xml, canonical absoluto y robots de rastreo.
7. Tests de rutas directas, JSON-LD, accesibilidad y visual, más verificación de HTTPS y logs del hosting.
8. La publicación y apertura SEO son acciones distintas; este build no habilita automáticamente ninguna.

## No permitido antes del gate
No activar rich snippets comerciales, inventario ficticio, correo o teléfono inventados, Search Console, IndexNow, publicidad ni indexación. La creación de `/llms.txt` no equivale a admisión por ChatGPT u otros buscadores. La existencia de artefactos no elimina la necesidad de configurar rutas limpias en el proveedor de hosting.

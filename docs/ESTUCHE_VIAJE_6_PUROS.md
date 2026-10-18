# Producto 03 — Estuche porta puros con humidificador

**Categoría y estructura:** se sustituye exclusivamente el artículo conceptual existente con id `estuche-viaje`; se preservan la categoría `estuches`, los seis artículos originales y el esquema de datos.

**Descripción de catálogo:** Un estuche compacto para transportar hasta seis puros con mayor comodidad. Incorpora un humidificador con esponja para ayudar a conservar la humedad y cuenta con cierre de cremallera. El proveedor lo describe como impermeable; su grado de protección no se ha verificado.

**Características declaradas por el usuario:** capacidad hasta seis puros, humidificador y esponja, estuche impermeable. Su protección contra agua y la humedad efectiva no han sido contrastadas mediante ensayos, y la fotografía no prueba el grado de sellado.

**Imágenes:** cinco fotografías facilitadas por el usuario con ajustes conservadores de fondos y puesta en escena visual para Don Turrón. Los elementos propios de cada foto, incluidos cierres, discos, malla, puros, infografía y texto impreso, se mantienen. Algunas fotos ya tenían fondo negro, por lo que no se alteró el producto.

**Pendientes de publicación comercial:** SKU, precio, inventario, dimensiones, mantenimiento recomendado por fabricante, clasificación de resistencia al agua y condiciones de entrega; no se habilita checkout. Los puros representados no forman parte del artículo.

**Implementación:** el catálogo preserva exactamente los campos existentes; las vistas se definen en `ESTUCHE_VIEWS` y utilizan `photosOf` para reutilizar la galería, accesibilidad y estilos ya presentes. Se ha ampliado la prueba de navegador para comprobar cinco vistas y selección por clic.

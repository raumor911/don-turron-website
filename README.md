# Don Turrón — Sitio editorial y catálogo de accesorios

Primera versión **demostrable y responsive** de una boutique de accesorios para puros. Diseño inspirado directamente en el emblema y monograma aportados. Investigación y decisiones documentadas con el **núcleo AETHRYON DRAFT v2.0.0**.

> **ESTADO: PRELANZAMIENTO.** El sitio **no vende, no cobra, no reserva inventario y no acepta pedidos**. Su catálogo es conceptual. `noindex` está activo hasta contar con información comercial validada.

## Qué incluye

- Experiencia visual premium: negro mármol, oro cálido, tipografía editorial, monograma DT.
- Home, categorías, catálogo, fichas con detalles, manifiesto de marca y FAQ.
- Filtros funcionales por tipo, selección con cantidades en `localStorage` y botón para copiar consulta.
- Envío por `mailto:` **solo al configurar una dirección comercial válida**.
- Confirmación de mayor de edad por sesión (no equivale a verificación de identidad).
- Diseño adaptativo para escritorio, tableta y teléfono; navegación móvil y cierre de modales por teclado.
- Activos SVG locales, sin frameworks ni scripts de terceros para el funcionamiento.
- Expediente de decisiones [`docs/AETHRYON_EJECUCION.md`](docs/AETHRYON_EJECUCION.md).

## Arranque local

Requisitos: Python 3 o cualquier servidor HTTP estático. No necesitas `npm install`.

```bash
cd don-turron
python3 -m http.server 8080
# Abrir http://localhost:8080/
```

Puedes desplegar el contenido del directorio en Vercel, Netlify, Cloudflare Pages, GitHub Pages o un hosting estático. **No** configures un checkout directo sin backend/proveedor seguro.

## Personalización

**`config.js`** contiene:

```js
window.DON_TURRON_CONFIG = {
  storeName: 'Don Turrón',
  contactEmail: '',  // correo real para activar mailto
  currency: 'MXN',
  catalogMode: 'inquiry',
  siteUrl: ''
};
```

**`catalog.js`** tiene seis ejemplos. Para cada producto real reemplaza ID, nombre, categoría, descripción, características y dibujo por fotos correctas. No agregues precios/stock hasta contar con una fuente de verdad. El `id` debe ser único y estable para la selección local.

Los SVG en `assets/` son ilustraciones de apoyo, **no fotografías de productos disponibles**. El script `make-art.py` recrea esos SVG y es opcional en el despliegue. Los logos aportados se encuentran en el mismo directorio.

La etiqueta `<meta name="robots" content="noindex, nofollow">` y `robots.txt` impiden la indexación intencionadamente durante el pre-lanzamiento. Para habilitar indexación **después de validar el sitio**, retirar `noindex`, publicar el sitemap/canonical con el dominio auténtico, ajustar Open Graph y registrar el dominio en Search Console.

## Pruebas

Revisión de JavaScript:

```bash
node --check app.js
node --check config.js
node --check catalog.js
```

Prueba browser de humo, incluyendo filtros, cantidades, ficha, drawer, menú móvil y desbordamiento:

```bash
python -m pip install playwright
# Necesitas un navegador Chromium, ajusta executable_path en tests/qa_browser.py
python tests/qa_browser.py
```

La prueba inyecta los archivos y activos en memoria porque el navegador de este entorno no permite navegar a `localhost`/`file:`; verifica interacciones y diseños, no despliegue remoto ni pagos. Capturas de prueba excluidas de Git por `.gitignore`.

## Git / creación del repositorio remoto

El código de esta V1 está publicado en GitHub. Para clonar directamente:

```bash
git clone https://github.com/raumor911/don-turron-website.git
cd don-turron-website
```

El repositorio remoto de este proyecto es **https://github.com/raumor911/don-turron-website**. Si recibes un archivo `.bundle`, restaura con:

```bash
git clone don-turron.bundle don-turron
cd don-turron
# Y después añade origin según el repositorio real.
```

## Checklist de lanzamiento

- [ ] Identidad legal/comercial, contacto y dominio final.
- [ ] Productos reales: SKU, fotos, marcas, características, inventario, precios e impuestos.
- [ ] Cobertura, costo y tiempos de entrega; políticas de cambios y garantías.
- [ ] Revisión regulatoria pertinente al sector y territorio; políticas de pago aceptadas por el proveedor.
- [ ] Privacidad, términos y proceso de compra completo, si se recaban datos o pagos.
- [ ] Backend/commerce real, control de stock, pagos sandbox, pedido, confirmaciones, cancelaciones.
- [ ] Validación de edad jurídicamente adecuada según el caso.
- [ ] Optimización de imágenes reales, accesibilidad final, auditoría de seguridad y medición.
- [ ] SEO público (retirar `noindex`), indexación y analítica con consentimiento cuando corresponda.

© Don Turrón. Código entregado para desarrollo de este proyecto. Sin declaración de licencia abierta de redistribución.

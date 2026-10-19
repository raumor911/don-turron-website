# Don Turrón — Sitio editorial y catálogo de accesorios

Primera versión **demostrable y responsive** de una boutique de accesorios para puros. Diseño inspirado directamente en el emblema y monograma aportados. Investigación y decisiones documentadas con el **núcleo AETHRYON DRAFT v2.0.0**.

> **ESTADO: PRELANZAMIENTO.** El sitio **no vende, no cobra, no reserva inventario y no acepta pedidos**. Su catálogo contiene fichas documentadas de accesorios, sin ventas habilitadas. `noindex` está activo hasta contar con información comercial validada.

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

**`catalog.js`** se genera desde `knowledge/products.json` y contiene siete accesorios documentados. No agregues precios/stock hasta contar con una fuente de verdad. El `id` debe ser único y estable para la selección local.

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


## Atelier Motion V2 — experiencia premium

La versión V2 incorpora `premium.css` y `premium.js` como mejora progresiva de la experiencia visual: animaciones editoriales, reflejos interactivos, microinteracciones de íconos y respuesta de selección. Respeta `prefers-reduced-motion`; el control visible de movimiento fue retirado del pie. No activa compras. Documentación: [`docs/INTERACCIONES_PREMIUM_V2.md`](docs/INTERACCIONES_PREMIUM_V2.md). Pruebas: `python tests/qa_browser.py` (requiere Playwright y Chromium).


## DT Semantic Intelligence Layer V1 (integrado en main)

El catálogo actual ahora procede de `knowledge/products.json`. Editar `catalog.js` manualmente ya no es el flujo de mantenimiento: el compilador lo genera junto con los 11 recursos AI/LLMO y el marcado de la portada.

Ejecutar en Node.js 20 o superior:

```bash
npm run validate:knowledge
npm run build:semantic
npm run test:observability
npm run test:nojs # requiere Playwright y Chromium
```

La compilación crea siete tarjetas estáticas en `index.html`, siete fichas en `productos/<id>/index.html` y una guía en `guia/estuche-o-humidor/index.html`. Las galerías y la selección siguen en JavaScript, usando las mismas imágenes de `knowledge/products.json`.

**Release gate:** `semantic-release.json` exige modo `prelaunch`, sin dominio, indexación, ventas ni IndexNow. `noindex` y `robots.txt` siguen activos. Este flujo no despliega a producción.

**Fuentes y gobierno:** [Arquitectura](docs/DT_SEMANTIC_ARCHITECTURE.md), [Contrato](docs/DT_KNOWLEDGE_CONTRACT.md), [Claims](docs/DT_CLAIMS_GOVERNANCE.md), [Relevancia](docs/DT_RELEVANCE_LAYER.md), [SEO gates](docs/DT_SEO_RELEASE_GATES.md), [Observabilidad](docs/DT_CRAWLER_OBSERVABILITY.md), [Cambios](docs/DT_SEMANTIC_CHANGELOG.md).

## DT Telemetry V1 — rama de preparación

La rama `feat/dt-telemetry-v1` añade la captura de crawlers **por importación de logs del hosting/CDN**, clasificadores semánticos alimentados por `knowledge/` y manifiesto `ai/` de DT Semantic Core, escritor MySQL protegido y receptor Node opcional para `POST /api/telemetry`. No modifica el diseño. La telemetría permanece desactivada y no instala ni arranca automáticamente procesos en el sitio.

**Integración semántica:** DT Semantic Core PR #4 ya está fusionado en `main`; la telemetría reutiliza los archivos de `knowledge/` y el manifiesto `ai/` existentes, sin mantener un catálogo independiente.

**Ejecución:** `node --test telemetry/tests.mjs telemetry/receiver.test.mjs`; `python tests/qa_browser.py` con Playwright/Chromium. Para desplegar el receptor opcional, instalar `mysql2` del paquete `telemetry/package.json` en el backend autorizado y revisar [despliegue](docs/DT_TELEMETRY_DEPLOYMENT.md), [contrato SQL](docs/DT_TELEMETRY_DB_CONTRACT.md), [eventos](docs/DT_TELEMETRY_EVENTS.md) y [pruebas](docs/DT_TELEMETRY_TESTS.md).

**No operativa en MySQL real:** falta confirmar conexión, `SHOW COLUMNS`, `SHOW INDEX`, grants, retención y prueba controlada de persistencia. `TELEMETRY_ENABLED=false` y `TELEMETRY_WRITE_APPROVED=false` por defecto. Ni el cliente ni el importador realizan operaciones DDL.

## Cortapuros en V — Galería verificada

Se añadió la ficha `cortador-v-geometrico` con acabados plateado y dorado; los cinco archivos WebP originales están versionados en `assets/products/` con hashes documentados en [el control de activos](docs/DT_CORTADOR_V_ASSETS.md). Se mantiene el estado de prelanzamiento y no se registran precios ni existencias.

## Favicon monograma DT

Los íconos proceden de la silueta original del monograma, extraída con **transparencia real**. `favicon.ico` multirresolución es el respaldo; existen PNG de 16/32 px, variantes negra para tema claro y oro cálido para tema oscuro, y `apple-touch-icon` 180 px. La portada usa rutas relativas y las fichas de `productos/` y `guia/` usan `../../`. El generador `scripts/dt-semantic/pages.mjs` mantiene el favicon al regenerar fichas. Validación: `python tests/qa_favicon.py`. El emblema comercial y las fotografías no se han alterado.

## RAUVIA Consulting y encendedor Sarike — ficha nueva

El pie de página acredita el desarrollo con la frase **«Experiencia digital desarrollada por [RAUVIA Consulting](https://rauvia.com.mx/)»**. Se integra en `index.html` y en la plantilla `scripts/dt-semantic/pages.mjs`, con prueba de enlaces accesibles en las páginas prerenderizadas (`python tests/qa_rauvia_footer.py`).

Se incorpora como séptima tarjeta documentada `encendedor-sarike-butano` (encendedor metálico de butano con acabado plata/dorado y modos de llama descritos por el proveedor). Su ficha, tres imágenes WebP y atributos semánticos proceden de `knowledge/products.json` y `docs/ENCENDEDOR_SARIKE_BUTANO.md`. La tarjeta conceptual `encendedor-jet` se retiró al confirmar que Sarike ofrece flama suave y jet. Ninguno de los productos se ofrece todavía para compra. No se publican precios, existencias ni garantías sin verificación.

Los pipelines semántico y de telemetría compilan el catálogo vigente antes de comprobar las interacciones de navegador. No modificar `catalog.js`, `ai/` ni las fichas prerenderizadas manualmente: ejecutar `npm run build:semantic` para actualizarlas. El estado de prelanzamiento y `noindex` siguen activos.

## Ajuste editorial · catálogo de siete artículos y footer

El catálogo ya no publica la ilustración de un encendedor jet sin producto respaldado. El **encendedor Sarike** es la única ficha de encendedor: según el proveedor dispone de **flama suave y flama jet**, con lanzamiento previsto para enero de 2027. Se conserva la distinción entre especificaciones declaradas y ensayos no verificados. El footer presenta a la izquierda el aviso de derechos reservados y a la derecha el crédito enlazado a **RAUVIA Consulting**; se eliminó la leyenda visual «Sitio en preparación». También se retiró el selector visible de movimiento, manteniendo el ajuste de accesibilidad del sistema operativo. La indexación continúa bloqueada por el gate de prelanzamiento.

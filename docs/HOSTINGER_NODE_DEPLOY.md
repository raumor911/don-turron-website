# Don Turrón — desplegar desde GitHub en Hostinger Web App Node.js

## Corrección del error 503
Hostinger necesita un proceso HTTP para Web App Node.js. El repositorio anteriormente publicaba HTML estático y una función `api/catalog.js` diseñada para Vercel, **sin servidor ni comando npm start**. El arranque sigue el patrón probado en RAUVIA: `postinstall` ejecuta el build semántico, crea y verifica `dist/server.cjs` y `dist/public/`. El lanzador de `dist/server.cjs` inicia `server.js` (Express); los documentos públicos se sirven exclusivamente desde `dist/public`. Una falla de MySQL afecta `/api/catalog` pero no la portada.

### Parámetros en hPanel → Web App → repositorio GitHub
- Repositorio: `raumor911/don-turron-website`, rama: `main`.
- Framework: **Express**, si Hostinger lo detecta; en caso contrario, **Other (Node.js)**.
- Node.js: **22.x** o versión compatible 20+ (recomendado 22).
- Habilitar scripts de instalación: durante `npm install` se ejecuta `postinstall`, igual que en RAUVIA.
- Directorio raíz: raíz del repositorio, donde está `package.json`.
- Instalación de dependencias: `npm install`.
- Build command: `npm run build` (regenera HTML SEO, separa `dist/public` y genera la entrada Node); aunque el panel omita este paso, `postinstall` lo ejecuta al instalar.
- Entry file: **`dist/server.cjs`** (mismo contrato de publicación que RAUVIA).
- Directorio público del frontend: `dist/public/` (NO es la raíz del proyecto).
- Start command: **`npm start`** (equivale a `node dist/server.cjs`).
- Output directory: **dejar vacío** cuando Hostinger lo configure como servidor Express; aunque existe `dist/`, incluye el lanzador privado. NO seleccionar `dist/public` como salida de una aplicación estática si necesitas `/api/catalog`.
- Puerto: escucha `process.env.PORT || 3000` en `0.0.0.0`. Respetar el puerto que Hostinger entregue.

En Hostinger, reiniciar/redeploy después de editar ajustes. El despliegue desde GitHub puede ser automático cuando hay push a `main`; comprobar que la rama vinculada sea realmente `main`.

### Variables privadas EN HOSTINGER
Vercel y Hostinger **no comparten automáticamente** secretos. Configurar en hPanel:

| Variable | Valor/uso |
|---|---|
| `DT_DB_HOST` | Host real de MySQL accesible desde la Web App; no asumir `localhost` |
| `DT_DB_PORT` | `3306` si aplica |
| `DT_DB_NAME` | `u345974778_donturron` |
| `DT_DB_USER` | Usuario **sólo lectura** de productos |
| `DT_DB_PASSWORD` | Contraseña de productos (secreto) |

Las tablas `dt_products`, `dt_product_content`, `dt_variants` y `dt_inventory` ya deben estar creadas mediante migraciones 001-003 en la base de productos. La nueva columna opcional `sku_comercial` no es requisito para el endpoint actual, que preserva las relaciones usando `dt_variants.sku`.

La telemetría conserva otro pool y otra BD. Si se requiere mantener la captura, configurar también `DB_HOST`, `DB_PORT`, `DB_NAME=u345974778_rauviaplatform`, `DB_USER`, `DB_PASSWORD`, `TELEMETRY_ENABLED`, `TELEMETRY_WRITE_APPROVED`, `TELEMETRY_SITE_ID=don-turron`, `TELEMETRY_SITE_HOST` con el host que se usa efectivamente (sin esquema). El servidor reutiliza las rutas y el receptor **existentes**, sin alterar sus tablas ni autorizaciones. Mantener telemetría deshabilitada hasta verificar explícitamente el contrato original; **NO** usar credenciales de catálogo para `DB_*`.

Nunca poner contraseñas en `config.js`, GitHub, `.env.example` con valores reales ni código cliente.

### Comprobación después del despliegue
1. En el log de instalación buscar `DT_HOSTINGER_BUILD_READY` y `DT_HOSTINGER_INSTALL_READY`. Si falta cualquiera, el build/postinstall no terminó; revisar `npm install`, scripts desactivados, carpeta raíz y `dist/server.cjs`. En el arranque buscar `Don Turrón HTTP server ready`.
2. `https://www.donturron.com.mx/api/healthz` debe devolver `200` y `{"status":"ok","service":"don-turron"}`. Si la portada devuelve 503, comprobar build/start/entry y logs de Hostinger.
3. `/` debe devolver `200`. `/robots.txt` debe contener `Allow: /`, `/sitemap.xml` debe devolver `200` y diez `<loc>`.
4. `/productos/estuche-viaje/` y `/guia/estuche-o-humidor/` deben responder `200`.
5. `/api/catalog`: esperado `200` con ocho productos, datos de MySQL y `source: "don-turron-inventory"`; `503` sólo en esa ruta señala problemas de conexión, variables, privilegios o migración SQL. **La portada debe seguir en 200.**
6. `/api/telemetry/config` devuelve `enabled: false` hasta verificar y activar el receptor con las variables separadas.
7. Confirmar ambos hosts `donturron.com.mx` / `www.donturron.com.mx` en DNS y SSL de Hostinger. Canonical SEO vigente es el host `www`; realizar la redirección del apex a `www` en la plataforma sólo cuando ambos hosts funcionen.

### Pruebas locales
```bash
npm install
npm run build
npm run test:hostinger
npm start
# Entry file configurado en Hostinger: dist/server.cjs
# http://localhost:3000/
# http://localhost:3000/api/healthz
```
El puerto se puede cambiar con `PORT=3001 npm start`. Sin credenciales de MySQL, `/api/catalog` responderá 503 de forma controlada, mientras el sitio seguirá disponible. El frontend `liveCatalogEnabled: true` captura esa falla y muestra disponibilidad por confirmar.

### Seguridad
`server.js` sólo permite archivos estáticos declarados, directorios `assets/`, `productos/`, `guia/` y `ai/`. No sirve archivos del repositorio como `database/*.sql`, `knowledge/*.json`, fuentes `telemetry/`, `package.json`, `.env` ni `.git`. Las tablas de telemetría nunca se consultan desde `/api/catalog`.

### Diferencias con el primer intento
- Antes: `server.js` en la raíz y el HTML accesible directamente desde la fuente; el build dependía de un paso explícito de Hostinger.
- Ahora: `npm install` ejecuta `postinstall` → `npm run build` → `dist/server.cjs` + `dist/public`. Express **no inicia** con artefactos faltantes, y publica sólo la carpeta compilada.
- El build es idempotente, no exige Vite, React, herramientas nuevas ni devDependencies: conserva la arquitectura Vanilla actual.
- Si tras instalar y arrancar correctamente continúa el **503 en todo el dominio**, no se puede resolver mediante MySQL o contenido: revisar Hostinger Web App → configuración del entry file, logs de proceso, mapeo dominio/app, SSL y registros DNS. Una respuesta **200 de `/api/healthz`** demuestra que la app Express recibe el tráfico del host consultado.

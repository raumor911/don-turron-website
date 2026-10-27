# Don Turrón — desplegar desde GitHub en Hostinger Web App Node.js

## Corrección del error 503
Hostinger necesita un proceso HTTP para Web App Node.js. El repositorio anteriormente publicaba HTML estático y una función `api/catalog.js` diseñada para Vercel, **sin servidor ni comando npm start**. Ahora `server.js` inicia Express, sirve sólo documentos/recursos públicos y reutiliza la API MySQL desde Hostinger. Una falla de MySQL afecta `/api/catalog` pero no la portada.

### Parámetros en hPanel → Web App → repositorio GitHub
- Repositorio: `raumor911/don-turron-website`, rama: `main`.
- Framework: **Express**, si Hostinger lo detecta; en caso contrario, **Other (Node.js)**.
- Node.js: **22.x** o versión compatible 20+.
- Directorio raíz: raíz del repositorio, donde está `package.json`.
- Instalación de dependencias: `npm install`.
- Build command: `npm run build` (regenera HTML semántico y SEO).
- Entry file: **`server.js`** (no `api/catalog.js` ni `index.html`).
- Start command: **`npm start`** (equivale a `node server.js`).
- Output directory para esta app **Express backend**: **sin configurar / dejar vacío**; no es un proyecto con carpeta `dist`.
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
1. `https://www.donturron.com.mx/api/healthz` debe devolver `200` y `{"status":"ok","service":"don-turron"}`. Si la portada devuelve 503, comprobar build/start/entry y logs de Hostinger.
2. `/` debe devolver `200`. `/robots.txt` debe contener `Allow: /`, `/sitemap.xml` debe devolver `200` y diez `<loc>`.
3. `/productos/estuche-viaje/` y `/guia/estuche-o-humidor/` deben responder `200`.
4. `/api/catalog`: esperado `200` con ocho productos, datos de MySQL y `source: "don-turron-inventory"`; `503` sólo en esa ruta señala problemas de conexión, variables, privilegios o migración SQL. **La portada debe seguir en 200.**
5. `/api/telemetry/config` devuelve `enabled: false` hasta verificar y activar el receptor con las variables separadas.
6. Confirmar ambos hosts `donturron.com.mx` / `www.donturron.com.mx` en DNS y SSL de Hostinger. Canonical SEO vigente es el host `www`; realizar la redirección del apex a `www` en la plataforma sólo cuando ambos hosts funcionen.

### Pruebas locales
```bash
npm install
npm run build
npm run test:hostinger
npm start
# http://localhost:3000/
# http://localhost:3000/api/healthz
```
El puerto se puede cambiar con `PORT=3001 npm start`. Sin credenciales de MySQL, `/api/catalog` responderá 503 de forma controlada, mientras el sitio seguirá disponible. El frontend `liveCatalogEnabled: true` captura esa falla y muestra disponibilidad por confirmar.

### Seguridad
`server.js` sólo permite archivos estáticos declarados, directorios `assets/`, `productos/`, `guia/` y `ai/`. No sirve archivos del repositorio como `database/*.sql`, `knowledge/*.json`, fuentes `telemetry/`, `package.json`, `.env` ni `.git`. Las tablas de telemetría nunca se consultan desde `/api/catalog`.

# DT-TEL-002 — despliegue, conexión y activación segura

## Sin hosting real verificado
Don Turrón sirve HTML estático; los archivos en esta rama **no activan captura por sí solos**. Primero fusionar DT Semantic Core PR #4, resolver diferencias y comprobar el proveedor del hosting, su disponibilidad de logs HTTP exportables y su política de retención. El importador acepta líneas JSON normalizadas (NDJSON); no depende de `X-Forwarded-For`.

## Servidor opcional
El receptor nativo en `telemetry/receiver.mjs` se inicia sobre `127.0.0.1:4385` y no sirve el sitio ni intercepta páginas. Si el hosting admite un proxy de `/api/telemetry` y `/api/telemetry/config`, enrutar solamente esas dos rutas, con TLS y cabeceras Origin correctas. En hosting puramente estático el cliente funciona en modo desactivado; los crawlers se analizan con logs del servidor/CDN.

## Variables privadas
```dotenv
TELEMETRY_ENABLED=false
TELEMETRY_WRITE_APPROVED=false
TELEMETRY_SITE_ID=don-turron
TELEMETRY_SITE_HOST=
DB_HOST=
DB_PORT=3306
DB_NAME=u345974778_rauviaplatform
DB_USER=
DB_PASSWORD=
TELEMETRY_PORT=4385
```
Nunca publicar valores reales en GitHub, variables de navegador ni archivos públicos. `DB_NAME` debe ser exactamente `u345974778_rauviaplatform`. Los parámetros son del servidor; no se infiere el host a partir de RAUVIA. `npm install --prefix telemetry --omit=dev` únicamente en backend autorizado.

## Verificación real obligatoria — NO EJECUTADA
1. Registrar responsable, autorización de acceso y retención de RAUVIA.
2. Con credenciales en backend privado, ejecutar `SHOW COLUMNS FROM <tabla>`, `SHOW INDEX FROM <tabla>` para las cuatro tablas, y `SHOW GRANTS FOR CURRENT_USER()`. Revisar el diagnóstico de `validateSchema` y las concesiones reales.
3. Habilitar temporalmente `TELEMETRY_ENABLED=true` y `TELEMETRY_WRITE_APPROVED=true` **solo en prueba controlada**.
4. Importar una fila HTTP ficticia con `test_run=true` en propiedades, o aceptar evento humano de prueba; confirmar escritura y `site_id='don-turron'` mediante SELECT desde MySQL.
5. Verificar atributos semánticos, marca de tiempo UTC y ausencia de IP. Consultar solo conteos de otros `site_id`, sin modificación.
6. Confirmar que la escritura de `web_events` está protegida por índices compuestos site_id / visitor_id / session_id. Desactivar prueba; revisar registros de errores y coste de consultas.
7. Comprobar el contrato de retención antes de activar captura; no se ejecuta ningún DELETE ni DDL.

Si falta una columna, índice, tipo, permiso o credencial: **dejar escritura deshabilitada** y abrir un diagnóstico; nunca corregir esquema automáticamente. El texto de error de BD no se envía al navegador.

## Operación de logs
```bash
cat exportacion-hosting.ndjson | node telemetry/import-logs.mjs
```
Escribir un adaptador nuevo si el proveedor entrega Apache/Nginx combined u otro formato; **no asumir que NDJSON genérico incluye status verdadero**. El normalizador descarta URLs con consultas, IP, referers y cabeceras innecesarias. No se deduplican solicitudes por intervalo. En fallas, la cola de 30 eventos pierde registros controladamente y cuenta drops.

## Dependencia de despliegue
La capa del cliente es imperceptible para la navegación y obtiene `enabled` del endpoint; si no existe o falla, no registra eventos. En serverless no prometer tareas posteriores a la respuesta: preferir servicio persistente o importación batch de logs. Una respuesta 204 indica aceptación, **no persistencia**.

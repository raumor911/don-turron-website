# DT Telemetry V1 — Contrato MySQL central

Base existente: `u345974778_rauviaplatform`. Las tablas compartidas son `ai_crawler_visits`, `visitors`, `sessions` y `web_events`. No se crean ni modifican tablas, índices ni registros de otros sitios.

## Inspección obligatoria
El servidor debe ejecutar, bajo credenciales privadas, `SHOW COLUMNS FROM <table>` y `SHOW INDEX FROM <table>` para cada tabla mencionada, además de `SHOW GRANTS FOR CURRENT_USER()`. Código: `telemetry/schema.mjs`. Las columnas deben existir, los tipos ser compatibles y cualquier campo adicional NOT NULL sin default debe impedir la escritura. Los índices de visitantes y sesiones deben contener la clave única compuesta `(site_id,visitor_id)` y `(site_id,session_id)`, respectivamente; no se acepta índice UNIQUE aislado por visitor_id o session_id. En todos los casos se exige un índice que comience por site_id. `ip_hash` debe ser nullable.

**Advertencia:** aún no se conoce el esquema real. El validador puede ser más restrictivo que las tablas actuales; si rechaza el esquema, no se alterará automáticamente. Mostrar diagnóstico, validar con el administrador y solicitar autorización explícita para cualquier ajuste.

## Crawler INSERT
```sql
INSERT INTO ai_crawler_visits (
 site_id,crawler_name,crawler_family,user_agent,request_path,request_method,
 status_code,referer,requested_at,response_time_ms,ip_hash,properties
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?);
```
`site_id` siempre se fija a `don-turron` desde el servidor. `referer=NULL` e `ip_hash=NULL`. `requested_at` usa UTC. `properties` contiene exclusivamente contexto semántico permitido y evidencia de detección `claimed`; no conserva IP, query strings, contactos, mensajes ni compras inferidas.

## Eventos humanos
`visitors` y `sessions` se insertan/actualizan con las mismas columnas observadas en Allison, pero el código usa transacción secuencial para garantizar que `web_events` no quede huérfano. Los IDs aleatorios del navegador se convierten en IDs de namespace `don-turron` mediante SHA-256. `event_timestamp` se inserta en UTC. No se aceptan datos de otro sitio ni se escriben propiedades abiertas. Se respeta el bloqueo por esquema y permisos.

## Fallo seguro
Variables iniciales: `TELEMETRY_ENABLED=false`, `TELEMETRY_WRITE_APPROVED=false`. Pool 3; cola acotada 30; timeout 3000 ms por consulta; backoff 30000 ms por fallo. Un HTTP 204 de telemetría humana indica recepción, no persistencia. Los contadores `events_persisted`, `events_failed`, `events_dropped` reflejan únicamente el proceso actual; no constituyen auditoría duradera.

## Comprobación de conectividad
**No ejecutada contra la base real en esta intervención.** Falta acceso autorizado a `DB_HOST`, `DB_USER` y `DB_PASSWORD`, así como a la configuración de retención. Las pruebas de CI usan exclusivamente dobles de prueba. No se efectuaron DDL, DML ni SELECT de datos reales.

El contenido persistido en la columna `user_agent` se limita al nombre canónico declarado del crawler, no a la cabecera HTTP completa, para evitar guardar cadenas arbitrarias o identificadores accidentales. Los registros importados deben tener marca temporal ISO-8601 con zona explícita u origen numérico UTC; se rechazan horas locales ambiguas.

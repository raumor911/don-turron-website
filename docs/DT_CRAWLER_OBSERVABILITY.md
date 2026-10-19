# DT-SC-004 — Observabilidad de crawlers

## Estado y límites
El sitio es estático, todavía no hay un proveedor de hosting/CDN confirmado ni acceso a logs reales. **No se implementa un backend de telemetría, ni se atribuyen visitas a recomendaciones.** Se entrega un contrato de ocho eventos en `docs/DT_CRAWLER_EVENT_CONTRACT.json` y un normalizador local `scripts/dt-semantic/observability.mjs`.

## Fuentes
Preferir acceso autorizado a registros HTTP de hosting o CDN. Sin esos registros, el navegador no puede indicar de manera fiable que un crawler descargó una página. Si se habilita un servicio externo de analítica, integrar aparte con consentimiento y revisión de privacidad.

## Eventos
- `crawler_request`: solicitud con User-Agent de apariencia bot, **no verificada**.
- `crawler_verified`: reservado para evidencia independiente futura (validación DNS/reverse DNS o afirmación comprobable del CDN). **El adaptador actual nunca lo emite**.
- `crawler_unverified`: UA bot-like sin prueba adicional.
- `semantic_asset_request`: solicitud HTTP de `/ai/`, `llms.txt` o `llms-full.txt`.
- `product_page_request`: solicitud de `/productos/<id>/` con ID conocido.
- `crawler_http_error`: solicitud bot-like con código HTTP >=400, sin afirmación de identidad.
- `search_referral`: referencia desde un host de búsqueda reconocido, no indicio de una recomendación específica.
- `product_interaction`: formato reservado a eventos de una integración explícita; no implica compra ni guarda datos personales.

El contrato no contiene direcciones IP, identificadores de usuario, URLs con query strings, correos ni tokens; el adaptador descarta esos campos. Los datos de entrada **no** deben registrarse en el repositorio. Conservar y eliminar logs únicamente conforme a las políticas aplicables al hosting y de privacidad.

## Uso offline
```bash
cat registros-proveedor.ndjson | node scripts/dt-semantic/observability.mjs > eventos-normalizados.ndjson
node scripts/dt-semantic/observability.test.mjs
```
Se requiere mapear el formato real del hosting al normalizador antes de producción. Los eventos no se envían a ninguna URL. El adaptador es únicamente una capa de preparación, con señales heurísticas no verificadas.

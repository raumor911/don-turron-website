-- DT Telemetry V1: consultas estrictamente de lectura; en la base central compartida.
-- No ejecutar sin permisos, retención aprobada y comprobación del esquema.
SELECT crawler_name, crawler_family, COUNT(*) AS requests
FROM ai_crawler_visits WHERE site_id='don-turron' GROUP BY crawler_name,crawler_family ORDER BY requests DESC;

SELECT DATE(requested_at) AS utc_day, COUNT(*) AS requests
FROM ai_crawler_visits WHERE site_id='don-turron' GROUP BY DATE(requested_at) ORDER BY utc_day DESC;

SELECT request_path, COUNT(*) AS requests
FROM ai_crawler_visits WHERE site_id='don-turron' GROUP BY request_path ORDER BY requests DESC LIMIT 40;

SELECT JSON_UNQUOTE(JSON_EXTRACT(properties,'$.product_id')) AS product_id, COUNT(*) AS requests
FROM ai_crawler_visits WHERE site_id='don-turron' AND JSON_EXTRACT(properties,'$.product_id') IS NOT NULL
GROUP BY JSON_UNQUOTE(JSON_EXTRACT(properties,'$.product_id')) ORDER BY requests DESC;

SELECT request_path, COUNT(*) AS requests
FROM ai_crawler_visits WHERE site_id='don-turron'
 AND (request_path LIKE '/ai/%' OR request_path IN ('/llms.txt','/llms-full.txt'))
GROUP BY request_path ORDER BY requests DESC;

SELECT status_code, COUNT(*) AS requests FROM ai_crawler_visits
WHERE site_id='don-turron' AND status_code>=400 GROUP BY status_code ORDER BY status_code;

SELECT event_name, COUNT(*) AS events FROM web_events
WHERE site_id='don-turron' GROUP BY event_name ORDER BY events DESC;

SELECT COUNT(*) AS test_requests FROM ai_crawler_visits
WHERE site_id='don-turron' AND JSON_EXTRACT(properties,'$.test_run')=true;
-- Métricas events_failed, events_dropped, queue_depth: solo memoria del proceso.
-- No afirmar persistencia con base únicamente en un HTTP 204 o contador events_captured.

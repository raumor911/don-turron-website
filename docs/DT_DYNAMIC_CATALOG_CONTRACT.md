# Don Turrón — Contrato del catálogo dinámico (MySQL / sitio / Kyberion)

## Fuente de verdad
La web pública lee exclusivamente la BD de productos **u345974778_donturron**, usando las variables DT_DB_* y el host local 127.0.0.1 ya configurado en Hostinger. Telemetría continúa en **u345974778_rauviaplatform** usando DB_*. Son bases independientes. El panel de escritura de Kyberion todavía no se ha desarrollado en este repositorio: esta fase prepara el consumidor público.

El backend publica desde una lectura MySQL común: página inicial, tarjetas, fichas /productos/{product_id}/, sitemap.xml, ai/products.json, ai/catalog.md, ai/knowledge-graph.json, llms.txt y llms-full.txt. **No se requiere un nuevo build ni un redeploy para cambiar un producto en MySQL**.

## Estados y escenarios

| Operación | Comportamiento |
|---|---|
| Alta válida en dt_products + dt_product_content, con variantes opcionales | Nueva tarjeta, filtro, ficha, sitemap y datos para crawlers |
| listed | Publicado; precio e inventario independientes por producto |
| coming_soon | Visible, próximamente, sin precio publicado |
| Out of stock | Visible como «Agotado», conserva el precio y bloquea selección sin modificar inventario |
| hidden | No visible, ficha HTTP 404, retirado del sitemap y de AI |
| Inventario 0 | Visible y marcado Agotado, selección deshabilitada |
| Inventario NULL | Por confirmar; nunca representa cero implícito |
| Cambio de precio, texto, imagen, categoría | Actualización al vencer el caché |
| Variante con is_active=0 | Excluida de opciones activas |
| Baja física | Evitar si existen movimientos o reservas históricas; usar baja lógica hidden |

Una nueva alta exige información completa en **ambas** tablas: dt_products (producto, precio, estado) y dt_product_content (categoría, título, descripción, características e imágenes). Una alta parcial permanece fuera de la lectura pública por su INNER JOIN. Kyberion deberá validar y guardar ambas partes transaccionalmente antes de publicar.

## Fotos, categorías e identificadores

- ID: slug estable de letras minúsculas, números y guiones (hasta 96). No reciclar IDs; un cambio de URL indexada exige redirección 301 posterior.
- Categoría: slug de hasta 64, genera filtro automáticamente. Los mosaicos editoriales de portada siguen siendo fijos y no sustituyen el filtro dinámico.
- Fotos: rutas existentes assets/products/nombre.webp o nuevas /media/products/nombre.webp. También URL HTTPS con ruta /media/products/nombre.webp desde dominios aprobados mediante DT_MEDIA_ORIGINS (orígenes separados por coma).
- Media persistente local opcional: DT_MEDIA_DIR puede apuntar a una ruta absoluta que termine en products; Express expone sólo archivos de imagen permitidos desde ese directorio. No ubicar imágenes nuevas en dist, porque se regenera en cada despliegue.
- Imágenes nuevas **no** tendrán necesariamente variantes comprimidas -320/-640; no se generan srcset inexistentes. Sin foto válida se utiliza ilustración de respaldo.
- **No hay subida de imágenes desde Kyberion en esta versión.** Requiere flujo posterior autenticado hacia almacenamiento persistente o un CDN aprobado.

## Lecturas y controles

Pool MySQL: máximo dos conexiones; cache de proceso cinco segundos, revalidación HTTP ETag, sin reservar existencias. Actualizaciones pueden tardar cerca de diez segundos en verse en nuevas visitas; pestañas ya abiertas deben recargar.

En fallo real de MySQL, API, ficha y sitemap responden 503. La portada institucional sigue disponible sin mostrar precios o existencias anteriores y temporalmente noindex, evitando anunciar como disponible un artículo oculto. Cuando vuelve MySQL, la publicación se restablece.

## Requisitos para el módulo de escritura Kyberion

1. Alta transaccional: validar dt_products, dt_product_content, dt_variants, dt_inventory y URLs de fotografías antes de listar.
2. Cambio: actualizar precio, categoría, detalle, imágenes, estado; usar control de concurrencia.
3. Inventario: transacciones e idempotencia entre dt_stock_movements y dt_inventory para entradas, ventas, devoluciones y ajustes.
4. Baja: marcar hidden conservando historial y reservas.
5. Seguridad: autenticación, permisos mínimos, auditoría; nunca exponer credenciales o escritura en el sitio público.

## Aceptación

- 8→9 artículos publicados, con categoría nueva y producto agotado: tarjeta, filtro, precio, página individual, sitemap y JSON AI correctos.
- Baja hidden: desaparece solamente esa ficha, URL HTTP 404, selección anterior depurada, otras tarjetas y precios intactos.
- Agotado: precio intacto, etiqueta Agotado y botón bloqueado sin afectar a otros.
- Fallo de MySQL: no mostrar inventario estático antiguo como confirmado.
- Ejecutar pruebas HTTP Node, catálogo y navegador en CI antes de merge.

No se requieren migraciones SQL adicionales para la lectura pública.

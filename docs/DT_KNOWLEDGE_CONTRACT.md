# DT Semantic Intelligence Layer — Contrato de conocimiento V1

- Fuente única: `knowledge/*.json`. Los productos se generan en `catalog.js`; no editar este archivo a mano una vez compilado.
- Los seis IDs de producto permanecen sin cambios y son la clave de la selección local.
- Los primeros cinco son `contentStatus: documented` y `commercialStatus: pending_confirmation`; el encendedor `conceptual/not_configured`.
- `visibility` determina emisión de activos públicos; el repositorio es público, por lo que **ningún dato privado debe guardarse en archivos de origen**, independientemente de `visibility`.
- `sourceIds`, `claimIds`, `productIds`, `useCaseIds` y demás referencias se validan contra el conjunto de IDs.
- `status: supplier_declared` indica procedencia descriptiva; no equivale a certificación externa. Los estados aceptados en claims son `verified | supplier_declared | pending | disputed | rejected`.
- Los atributos de las fotografías son descriptivos; no constituyen evidencia independiente de prestaciones o inventario.
- Los intents son **hipótesis de búsqueda**, no volúmenes medidos.
- Las variantes plata y negro no son SKU ni unidades de inventario.
- La futura colección de café no aparece en una oferta pública y no se guardan planes comerciales internos en este repositorio público.
- No agregar `Offer`, `InStock`, reseñas, puntuaciones, fabricantes o certificaciones sin una fuente legítima y verificación.

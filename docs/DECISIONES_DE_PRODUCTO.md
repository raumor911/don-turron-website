# Don Turrón — Decisiones de marca, experiencia y tecnología

## Dirección visual

El logo entregado es la fuente de identidad. El sitio combina negro carbón (#16130f), dorado envejecido (#be9761), crema cálido (#f4f0e9), serif editorial y sans geométrica. Los dos adjuntos originales se preservan: `assets/don-turron-emblema.jpg` y una extracción del monograma `assets/don-turron-monograma.png`. La segunda imagen original contenía guías de construcción, por lo que se extrajo una versión limpia del monograma; no sustituye un vector maestro entregado por el diseñador.

Los gráficos de productos son ilustraciones vectoriales **conceptuales** creadas para este prototipo, no fotografías verificadas de modelos o existencias. Reemplazar con fotografías propias de productos reales, manteniendo proporciones y optimización de archivos.

## Arquitectura de experiencia

1. Hero de marca + acceso a colección.
2. Categorías que representan intención funcional.
3. Catálogo con filtros y fichas individuales.
4. Selección de artículos, persistente en almacenamiento local, con ajuste de cantidades y copia de consulta.
5. Esencia/valores de marca y explicación de cómo usar la versión preliminar.
6. Preguntas frecuentes y límites comerciales explícitos.
7. Confirmación de mayoría de edad por sesión (control UX, **no** verificación jurídica de identidad).

No hay cobro real, reserva, gestión de inventario, procesamiento de datos del comprador, ni notificaciones a la tienda. El prototipo no simula un pedido exitoso.

## Seguridad y cumplimiento previo a producción

- Configurar contacto real y dominio; nunca incluir credenciales de pagos en el cliente.
- Definir responsable del tratamiento de datos y publicar aviso de privacidad aplicable antes de recolectar datos.
- Revisar requisitos regulatorios y reglas de la pasarela para accesorios de consumo para adultos en territorios donde se opere.
- Confirmar clasificación de productos, costos, impuestos, garantías, devoluciones, entregas y términos.
- Evaluar verificación de edad adecuada al marco legal: el aviso de este prototipo **no** prueba edad.
- No promover tabaco ni presentar afirmaciones de inocuidad.
- Activar SEO indexable solo cuando el contenido, dominio y condiciones comerciales estén validados. En la versión actual se mantiene `noindex`.

## Ruta técnica recomendada para la siguiente versión

Mantener frontend estático mientras no haya stock verificado. Con inventario real, seleccionar plataforma de comercio/pagos que acepte expresamente la categoría de productos, integrar precios y existencias desde una fuente única y añadir checkout seguro del proveedor. Probar todo el flujo de pago y reversión en sandbox antes de activar producción.

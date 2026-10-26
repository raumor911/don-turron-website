/**
 * Configuración pública. No guardar aquí llaves privadas ni secretos.
 * email vacío: no se muestra el CTA de enviar por correo.
 */
window.DON_TURRON_CONFIG = {
  storeName: 'Don Turrón',
  contactEmail: '', // Ej. contacto@dominio-propio.mx, cuando exista una cuenta real.
  currency: 'MXN',
  catalogMode: 'inquiry', // Selección por WhatsApp, sin cobro en el sitio.
  liveCatalogEnabled: false, // Requiere migración, API y secretos verificados.
  siteUrl: 'https://www.donturron.com.mx' // Dominio verificado en Vercel.
};

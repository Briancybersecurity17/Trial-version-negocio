/**
 * Convierte una ruta local de archivo a una URL que el renderer de Electron
 * puede cargar a través del protocolo personalizado `local-file://`.
 *
 * - Si ya es una URL http/https, data: o local-file:, la devuelve sin cambios.
 * - Si es una ruta Windows (C:\...) o Unix (/home/...), la normaliza.
 */
export function toImgSrc(url) {
  if (!url || url.trim() === '') return null;

  // Ya es una URL reconocida → sin cambios
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('local-file://')
  ) return url;

  // Ruta local → convertir a local-file://
  // 1. Normalizar separadores (Windows usa \)
  let normalized = url.replace(/\\/g, '/');
  // 2. Asegurar slash inicial para formar URL válida
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  // 3. Codificar caracteres especiales (espacios, etc.)
  return 'local-file://' + normalized.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

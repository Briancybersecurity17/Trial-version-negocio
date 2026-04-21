/**
 * Convierte un valor de image_url guardado en la DB a una URL utilizable
 * en el contexto actual (Electron o navegador de red).
 *
 * Valores posibles en la DB:
 *  - Nombre simple:   "COCA600.jpg"           → archivo en product-images/
 *  - URL http/https:  "https://..."            → sin cambios
 *  - Ruta legacy:     "C:\..." o "local-file://..." → compatibilidad
 *
 * Estrategia para Electron:
 *   Al importar este módulo se llama a electronServer.getInfo() por IPC
 *   y se guarda la URL base del servidor (ej: http://192.168.1.60:3001).
 *   Así no dependemos del timing de executeJavaScript desde main.js.
 */

const isElectron = typeof window !== 'undefined' && !!window.electronFiles;

// URL base resuelta al inicializar. En Electron se obtiene por IPC.
// En navegador de red se usa '' (rutas relativas bastan).
let _imageBase = '/images/';

// Inicialización asíncrona: se ejecuta al importar el módulo.
// Componentes que usen toImgSrc antes de que resuelva verán '/images/'
// (funciona en prod/navegador), pero en Electron esperarán la promesa.
let _ready = Promise.resolve();

if (isElectron && window.electronServer?.getInfo) {
  _ready = window.electronServer.getInfo()
    .then(info => {
      if (info?.url) {
        _imageBase = info.url.replace(/\/$/, '') + '/images/';
      }
    })
    .catch(() => {
      // Fallback: si falla IPC usar puerto por defecto
      _imageBase = 'http://127.0.0.1:3001/images/';
    });
}

/**
 * Espera a que la URL base del servidor esté resuelta.
 * Llamar en el punto de entrada de la app (ej: main.jsx) para garantizar
 * que los componentes ya tengan la URL correcta al renderizar.
 */
export function waitForImageBase() {
  return _ready;
}

export function toImgSrc(url) {
  if (!url || url.trim() === '') return null;

  // ── URLs externas → sin cambios ──────────────────────────────────────────
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) return url;

  // ── Nombre simple → imagen en product-images/ ────────────────────────────
  // Ej: "COCA600.jpg"
  if (!url.includes('/') && !url.includes('\\') && !url.startsWith('local-file:')) {
    return _imageBase + encodeURIComponent(url);
  }

  // ── Rutas legacy: local-file:// ──────────────────────────────────────────
  if (url.startsWith('local-file://')) {
    if (isElectron) return url;
    return null;
  }

  // ── Ruta absoluta cruda (C:\... o /home/...) ─────────────────────────────
  if (isElectron) {
    let normalized = url.replace(/\\/g, '/');
    if (!normalized.startsWith('/')) normalized = '/' + normalized;
    return 'local-file://' + normalized.split('/').map(s => encodeURIComponent(s)).join('/');
  }

  return null;
}

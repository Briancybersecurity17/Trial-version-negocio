/**
 * limits.js — Límites de carga centralizados
 *
 * Cada perfil define cuántos registros se cargan en cada sección.
 * El usuario elige su perfil desde Opciones > Rendimiento.
 *
 *  dashboard  → productos cargados en el panel principal
 *  products   → productos en Calculadora, Ventas, etc.
 *  heavy      → Inventario, Mermas, Gastos (vistas de análisis completo)
 *  exports    → exportaciones CSV/JSON (siempre alto, no se toca)
 */

const PROFILES = {
  small: {
    label:     { es: "Negocio pequeño",   en: "Small business"   },
    hint:      { es: "Hasta ~500 productos",   en: "Up to ~500 products"   },
    dashboard: 500,
    products:  500,
    heavy:     1000,
  },
  medium: {
    label:     { es: "Negocio mediano",   en: "Medium business"  },
    hint:      { es: "Hasta ~1000 productos",  en: "Up to ~1000 products"  },
    dashboard: 1000,
    products:  1000,
    heavy:     3000,
  },
  large: {
    label:     { es: "Negocio grande",    en: "Large business"   },
    hint:      { es: "Hasta ~2000 productos",  en: "Up to ~2000 products"  },
    dashboard: 2000,
    products:  2000,
    heavy:     5000,
  },
  wholesale: {
    label:     { es: "Mayorista",         en: "Wholesale"        },
    hint:      { es: "Hasta ~3500 productos",  en: "Up to ~3500 products"  },
    dashboard: 3500,
    products:  3500,
    heavy:     8000,
  },
};

const STORAGE_KEY = "performanceProfile";
const DEFAULT_PROFILE = "medium";

/** Devuelve el perfil activo ("small" | "medium" | "large" | "wholesale") */
export function getActiveProfile() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && PROFILES[stored] ? stored : DEFAULT_PROFILE;
}

/** Guarda el perfil elegido */
export function setActiveProfile(profileKey) {
  if (!PROFILES[profileKey]) return;
  localStorage.setItem(STORAGE_KEY, profileKey);
}

/** Devuelve los límites numéricos del perfil activo */
export function getLimits() {
  return PROFILES[getActiveProfile()];
}

/** Exporta los perfiles completos para renderizar la UI */
export { PROFILES };

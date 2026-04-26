# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

---

## [2.0.2] - 2026-04-26

### ✨ Novedades

**Perfiles de Rendimiento**
- Nueva sección "Perfil de Rendimiento" en Opciones que permite al usuario configurar cuántos registros carga la app según el tamaño de su negocio.
- 4 perfiles disponibles:
  - 🏪 **Negocio pequeño** — hasta ~500 productos
  - 🏬 **Negocio mediano** — hasta ~1000 productos (default)
  - 🏭 **Negocio grande** — hasta ~2000 productos
  - 🏗️ **Mayorista** — hasta ~3500 productos
- Los límites se aplican de forma diferenciada por sección: Dashboard, Productos/Calculadora e Inventario/Mermas/Gastos tienen topes proporcionales a su uso real.
- Las exportaciones CSV y Backup JSON no se ven afectadas por el perfil — siempre exportan el catálogo completo.

**Sincronización multi-dispositivo**
- El perfil de rendimiento y las categorías personalizadas ahora se sincronizan automáticamente entre todos los dispositivos conectados a la app (escritorio, celular, tablet, otra PC vía IP).
- Al arrancar la app en cualquier dispositivo, se lee la configuración del servidor y se aplica localmente de forma automática.
- Las funciones `fetchSettings` y `saveSettings` ahora incluyen el token de autenticación correctamente, resolviendo el problema donde el celular recibía configuración vacía.

### 🔧 Mejoras

**Inventario**
- Reemplazado el spinner de carga por un skeleton completo que imita la estructura real de la página (header, buscador, tarjetas de stats y filas de tabla).
- Se muestra un indicador al pie con el texto "Cargando hasta X registros…" usando el límite del perfil activo para que el usuario entienda por qué demora.

**Opciones — UI responsive**
- Las tarjetas de perfil de rendimiento usan grid `2 columnas en móvil/tablet → 4 columnas en escritorio`, asegurando una visualización correcta en cualquier dispositivo.

### 🐛 Correcciones

- Corregido el límite de productos en Dashboard que estaba hardcodeado en 200, causando que clientes con más de 200 productos no los vieran en el panel principal.
- Todos los límites de carga ahora están centralizados en `src/lib/limits.js` — eliminados los números hardcodeados dispersos en cada página.

### 📁 Archivos modificados

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/lib/limits.js` | Nuevo | Central de perfiles y límites de carga |
| `src/lib/LanguageContext.jsx` | Modificado | Sync de configuración con token de auth |
| `src/pages/Opciones.jsx` | Modificado | UI de perfiles + persistencia en backend |
| `src/pages/Dashboard.jsx` | Modificado | Límite dinámico vía `getLimits().dashboard` |
| `src/pages/Products.jsx` | Modificado | Límite dinámico vía `getLimits().products` |
| `src/pages/Calculadora.jsx` | Modificado | Límite dinámico vía `getLimits().products` |
| `src/pages/Inventario.jsx` | Modificado | Límite dinámico + skeleton de carga |
| `src/pages/Mermas.jsx` | Modificado | Límite dinámico vía `getLimits().heavy` |
| `src/pages/Gastos.jsx` | Modificado | Límite dinámico vía `getLimits().heavy` |
| `package.json` | Modificado | Versión bumpeada a 2.0.2 |

---

## [2.0.1] - anterior

- Versión estable de base.

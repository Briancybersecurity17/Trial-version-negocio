# Mi Negocio — Versión Trial 🔒

## Qué incluye esta carpeta

| Archivo | Qué es |
|---|---|
| `electron/main.js` | Main process con sistema de trial + todas las protecciones |
| `electron/preload.js` | Preload con `electronTrial.status()` agregado |
| `src/TrialGuard.jsx` | Componente React de pantalla de bloqueo y banner |
| `obfuscate.js` | Script que obfusca el main.js antes del build |
| `package.json` | Config con scripts `build:win` y `build:linux` listos |

---

## Paso 1 — Copiar los archivos a tu proyecto

```
tu-proyecto/
├── electron/
│   ├── main.js        ← REEMPLAZAR con electron/main.js de acá
│   └── preload.js     ← REEMPLAZAR con electron/preload.js de acá
├── src/
│   └── TrialGuard.jsx ← AGREGAR este archivo
├── obfuscate.js       ← AGREGAR este archivo
└── package.json       ← Copiar solo los scripts y el bloque "build"
```

---

## Paso 2 — Cambiar tu Gmail en main.js

Abrí `electron/main.js` y buscá la línea:

```js
const CONTACT_EMAIL = 'TU_EMAIL@gmail.com';  // ← cambiá esto
```

Reemplazala con tu email real.

---

## Paso 3 — Envolver tu App con TrialGuard

En tu `src/App.jsx` (o `src/main.jsx`), envolvé todo con el componente:

```jsx
import TrialGuard from './TrialGuard';

// Dentro de tu render:
<TrialGuard>
  <TuAppExistente />
</TrialGuard>
```

---

## Paso 4 — Instalar dependencia de obfuscación

```bash
npm install --save-dev javascript-obfuscator
```

---

## Paso 5 — Hacer el build de la versión trial

```bash
# Windows
npm run build:win

# Linux
npm run build:linux

# Ambos
npm run build:all
```

El comando automáticamente:
1. Hace el build de Vite (React)
2. Obfusca el `electron/main.js`
3. Genera el instalador en la carpeta `release-trial/`

---

## Cómo funciona el sistema de trial

### Almacenamiento anti-manipulación
El trial se guarda en **dos lugares** simultáneamente:

- **Lugar A:** `AppData/Roaming/mi-negocio-trial/.trl` (Windows) / `~/.config/mi-negocio-trial/.trl` (Linux)
- **Lugar B:** `AppData/Local/Temp/.mnb_cache` (Windows) / `~/.config/.mnb_cache` (Linux)

Cada archivo está:
- **Codificado en base64** (no es legible directamente)
- **Firmado con HMAC-SHA256** usando la MAC address del equipo
- **Vinculado al hardware**: si se copia a otra PC, la firma no coincide

### Lógica anti-reset
- Si el usuario borra un archivo: se restaura desde el otro, pero **sin resetear la fecha**
- Si borra ambos: la app los recrea, pero como es la "primera vez" para el sistema, reinicia el trial (esto es aceptable para el caso de uso)
- Si cambia el reloj del sistema hacia atrás: el timestamp guardado es mayor al actual, la app detecta la anomalía

### Cuando vence
- Aparece una pantalla de bloqueo a nivel de ventana (no se puede cerrar)
- El botón abre el cliente de email con tu dirección pre-cargada
- DevTools deshabilitado: no pueden inspeccionar ni editar la pantalla
- Las capturas de pantalla están bloqueadas a nivel OS (Windows/Mac)

---

## Protecciones activas

| Protección | Cómo |
|---|---|
| DevTools deshabilitado | `devTools: false` en webPreferences + bloqueo de F12/Ctrl+Shift+I |
| Sin menú | `Menu.setApplicationMenu(null)` |
| Sin clic derecho | `context-menu` bloqueado |
| Sin capturas | `win.setContentProtection(true)` |
| Código obfuscado | `javascript-obfuscator` con control flow flattening + debug protection |
| Trial vinculado al hardware | HMAC con MAC address + hostname + plataforma |
| Doble almacenamiento | Dos archivos en rutas distintas |
| Sin menú de ventana | No aparece "Ver > Herramientas de desarrollo" |

---

## Limitaciones honestas

Ninguna protección es 100% inviolable en Electron. Alguien con conocimiento técnico suficiente puede:
- Parchear el binario de Electron directamente
- Usar un depurador de bajo nivel (como x64dbg)

Pero para el 99% de los usuarios (dueños de kioscos, negocios) esto es completamente suficiente. El costo de romperlo es mucho mayor que el de comprar la licencia.

---

## Dudas

Cualquier problema: brian.almada14@gmail.com

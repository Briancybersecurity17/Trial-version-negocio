import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { waitForImageBase } from '@/utils/localImage'

// Esperar a que la URL base de imágenes esté resuelta antes de renderizar.
// En Electron obtiene la IP del servidor por IPC (evita timing issues).
// En navegador de red resuelve inmediatamente.
waitForImageBase().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  )
})

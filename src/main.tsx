import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './app'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error(
    'No se encontró el elemento #root. Revisa que index.html tenga <div id="root"></div>.',
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './app'
import { FirstRunGate, createOwner, hasOwner } from './features/auth'
import { StorageImpl } from './storage/storage'
import './index.css'

const storage = new StorageImpl()

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error(
    'No se encontró el elemento #root. Revisa que index.html tenga <div id="root"></div>.',
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <FirstRunGate
      hasOwner={() => hasOwner(storage.repositories.users)}
      createOwner={(input) => createOwner(storage, input)}
    >
      <App />
    </FirstRunGate>
  </StrictMode>,
)

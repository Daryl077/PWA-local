import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppRoot } from './app-root'
import { AuthServiceImpl } from './features/auth'
import { StorageImpl } from './storage/storage'
import './index.css'

const storage = new StorageImpl()
const auth = new AuthServiceImpl(storage)

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error(
    'No se encontró el elemento #root. Revisa que index.html tenga <div id="root"></div>.',
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <AppRoot storage={storage} auth={auth} />
  </StrictMode>,
)

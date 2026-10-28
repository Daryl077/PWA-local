import { useState } from 'react'

import App from './app'
import type { Result } from './contracts/common'
import type { UserInfo } from './contracts/entities'
import type { Storage } from './contracts/storage'
import {
  AuthServiceImpl,
  FirstRunGate,
  LockOverlay,
  LoginScreen,
  createOwner,
  hasOwner,
} from './features/auth'

type Props = {
  storage: Storage
  auth: AuthServiceImpl
}

/**
 * Flujo de entrada: primer uso, login, trabajo y bloqueo rápido. La sesión
 * vive en el servicio y se pierde al recargar, como corresponde a un
 * dispositivo compartido en el local.
 */
export function AppRoot({ storage, auth }: Props) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  function handleLogout() {
    auth.logout()
    setUser(null)
    setIsLocked(false)
  }

  async function handleUnlock(password: string): Promise<Result<UserInfo>> {
    const result = await auth.unlock(password)

    if (result.ok) {
      setUser(result.value)
      setIsLocked(false)
    } else if (
      result.error.code === 'NOT_AUTHENTICATED' ||
      result.error.code === 'ACCOUNT_UNAVAILABLE'
    ) {
      setUser(null)
      setIsLocked(false)
    }

    return result
  }

  async function handleLogin(name: string, password: string): Promise<Result<UserInfo>> {
    const result = await auth.login(name, password)
    if (result.ok) setUser(result.value)

    return result
  }

  return (
    <FirstRunGate
      hasOwner={() => hasOwner(storage.repositories.users)}
      createOwner={(input) => createOwner(storage, input)}
    >
      {user === null ? (
        <LoginScreen onLogin={handleLogin} />
      ) : isLocked ? (
        <LockOverlay userName={user.name} onUnlock={handleUnlock} onLogout={handleLogout} />
      ) : (
        <App
          user={user}
          can={(action) => auth.can(action)}
          onLock={() => {
            auth.lock()
            setIsLocked(true)
          }}
          onLogout={handleLogout}
        />
      )}
    </FirstRunGate>
  )
}

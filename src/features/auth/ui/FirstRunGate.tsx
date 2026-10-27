import { useEffect, useState, type ReactNode } from 'react'

import type { Result } from '../../../contracts/common'
import type { UserInfo } from '../../../contracts/entities'
import type { FirstRunInput } from '../domain/first-run'
import { FirstRunScreen } from './FirstRunScreen'

type Props = {
  hasOwner: () => Promise<boolean>
  createOwner: (input: FirstRunInput) => Promise<Result<UserInfo>>
  children: ReactNode
}

type GateStatus = 'checking' | 'first-run' | 'ready' | 'failed'

/**
 * Deja pasar a la app solo si ya existe el Dueño; si no, muestra el primer uso.
 * Las funciones se reciben desde afuera para poder probar la pantalla sin Dexie.
 */
export function FirstRunGate({ hasOwner, createOwner, children }: Props) {
  const [status, setStatus] = useState<GateStatus>('checking')

  useEffect(() => {
    let isMounted = true

    hasOwner()
      .then((exists) => {
        if (isMounted) setStatus(exists ? 'ready' : 'first-run')
      })
      .catch(() => {
        if (isMounted) setStatus('failed')
      })

    return () => {
      isMounted = false
    }
  }, [hasOwner])

  if (status === 'checking') {
    return (
      <p role="status" className="p-6 text-stone-600">
        Preparando el dispositivo…
      </p>
    )
  }

  if (status === 'failed') {
    return (
      <p role="alert" className="p-6 text-red-800">
        No se pudo revisar el dispositivo. Recarga la app e intenta de nuevo.
      </p>
    )
  }

  if (status === 'first-run') {
    return (
      <FirstRunScreen
        onCreate={async (input) => {
          const result = await createOwner(input)
          if (result.ok) setStatus('ready')
          return result
        }}
      />
    )
  }

  return <>{children}</>
}

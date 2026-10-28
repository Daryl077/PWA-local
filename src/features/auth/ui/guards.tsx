import type { ReactNode } from 'react'

import type { UserInfo } from '../../../contracts/entities'
import type { Action } from '../../../contracts/services'

type RouteGuardProps = {
  user: UserInfo | null
  isLocked?: boolean
  fallback?: ReactNode
  children: ReactNode
}

/** Deja pasar solo con sesión abierta y desbloqueada (RF-SEG-01, RNF-PLA-09). */
export function RouteGuard({ user, isLocked = false, fallback, children }: RouteGuardProps) {
  if (user && !isLocked) return <>{children}</>

  return <>{fallback ?? <p role="status">Inicia sesión para continuar.</p>}</>
}

type RoleGuardProps = {
  can: (action: Action) => boolean
  action: Action
  fallback?: ReactNode
  children: ReactNode
}

/** Oculta una pantalla cuando el rol no tiene el permiso (RF-SEG-02, RF-SEG-04). */
export function RoleGuard({ can, action, fallback, children }: RoleGuardProps) {
  if (can(action)) return <>{children}</>

  return <>{fallback ?? <p role="status">No tienes permiso para ver esta pantalla.</p>}</>
}

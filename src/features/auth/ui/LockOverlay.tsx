import { useState, type FormEvent } from 'react'

import type { Result } from '../../../contracts/common'
import type { UserInfo } from '../../../contracts/entities'

type LockOverlayProps = {
  userName: string
  onUnlock: (password: string) => Promise<Result<UserInfo>>
  onLogout: () => void
}

/**
 * Bloqueo rápido de pantalla (RNF-PLA-09). Cubre la app y pide la contraseña
 * del usuario actual. No se puede cerrar sin desbloquear o cerrar sesión.
 */
export function LockOverlay({ userName, onUnlock, onLogout }: LockOverlayProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsChecking(true)

    try {
      const result = await onUnlock(password)

      if (!result.ok) {
        setError(`${result.error.why} ${result.error.how}`)
        setIsChecking(false)
      }
    } catch {
      setError('No se pudo desbloquear la pantalla. Inténtalo otra vez.')
      setIsChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lock-overlay-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="lock-overlay-title" className="text-xl font-semibold text-stone-900">
          Pantalla bloqueada
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Hola, {userName}. Escribe tu contraseña para continuar.
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-stone-700" htmlFor="lock-password">
            Contraseña
          </label>
          <input
            id="lock-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2"
          />

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isChecking}
            className="min-h-11 w-full rounded-lg bg-amber-600 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {isChecking ? 'Desbloqueando…' : 'Desbloquear'}
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="mt-3 min-h-11 w-full rounded-lg px-4 py-2 text-sm text-stone-600 underline"
        >
          Cerrar sesión
        </button>
      </section>
    </div>
  )
}

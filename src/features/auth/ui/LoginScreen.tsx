import { useState, type FormEvent } from 'react'

import type { Result } from '../../../contracts/common'
import type { UserInfo } from '../../../contracts/entities'

type Props = {
  onLogin: (name: string, password: string) => Promise<Result<UserInfo>>
}

const fieldClasses =
  'mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 text-base ' +
  'focus:border-amber-600 focus:outline-2 focus:outline-offset-1 focus:outline-amber-600'

/** Entrada con nombre y contraseña para el Dueño o un Vendedor (RF-SEG-01). */
export function LoginScreen({ onLogin }: Props) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsChecking(true)

    try {
      const result = await onLogin(name, password)
      if (!result.ok) {
        setErrorMessage(`${result.error.why} ${result.error.how}`)
        setIsChecking(false)
      }
    } catch {
      setErrorMessage(
        'No se pudo iniciar sesión porque el dispositivo no respondió. Inténtalo otra vez.',
      )
      setIsChecking(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-amber-700 uppercase">Licorería</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">Iniciar sesión</h1>
        <p className="mt-2 text-stone-600">Entra con tu cuenta para abrir el punto de venta.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="login-name" className="block text-sm font-medium text-stone-800">
              Nombre
            </label>
            <input
              id="login-name"
              className={fieldClasses}
              type="text"
              autoComplete="username"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-stone-800">
              Contraseña
            </label>
            <input
              id="login-password"
              className={fieldClasses}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {errorMessage ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isChecking}
            className="min-h-11 w-full rounded-lg bg-amber-600 px-5 font-medium text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-60"
          >
            {isChecking ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}

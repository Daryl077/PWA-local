import { useState, type FormEvent } from 'react'

import type { Result } from '../../../contracts/common'
import type { UserInfo } from '../../../contracts/entities'
import type { FirstRunInput } from '../domain/first-run'

type Props = {
  onCreate: (input: FirstRunInput) => Promise<Result<UserInfo>>
}

const fieldClasses =
  'mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 text-base ' +
  'focus:border-amber-600 focus:outline-2 focus:outline-offset-1 focus:outline-amber-600'

export function FirstRunScreen({ onCreate }: Props) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSaving(true)

    try {
      const result = await onCreate({ name, password })
      if (!result.ok) {
        setErrorMessage(`${result.error.why} ${result.error.how}`)
        setIsSaving(false)
      }
    } catch {
      setErrorMessage(
        'No se pudo crear el Dueño porque el dispositivo no respondió. Revisa el espacio libre y vuelve a intentarlo.',
      )
      setIsSaving(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-amber-700 uppercase">Licorería</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">Primer uso</h1>
        <p className="mt-2 text-stone-600">
          Crea la cuenta del Dueño. Solo se puede crear una vez en este dispositivo.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="first-run-name" className="block text-sm font-medium text-stone-800">
              Tu nombre
            </label>
            <input
              id="first-run-name"
              className={fieldClasses}
              type="text"
              autoComplete="username"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="first-run-password"
              className="block text-sm font-medium text-stone-800"
            >
              Contraseña
            </label>
            <input
              id="first-run-password"
              className={fieldClasses}
              type="password"
              autoComplete="new-password"
              aria-describedby="first-run-password-hint"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p id="first-run-password-hint" className="mt-1 text-xs text-stone-500">
              Al menos 8 caracteres.
            </p>
          </div>

          {errorMessage ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSaving}
            className="min-h-11 w-full rounded-lg bg-amber-600 px-5 font-medium text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-60"
          >
            {isSaving ? 'Creando…' : 'Crear Dueño'}
          </button>
        </form>
      </section>
    </main>
  )
}

import { useState, type FormEvent } from 'react'

import { categoryInputSchema, type CategoryInput } from '../domain/schemas'
import type { Category } from '../../../contracts/entities'

type Props = {
  initialCategory?: Category | null
  onSubmit: (input: CategoryInput) => Promise<void>
  onCancel?: () => void
  submitLabel: string
}

const fieldClasses =
  'mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 text-base ' +
  'focus:border-amber-600 focus:outline-2 focus:outline-offset-1 focus:outline-amber-600'

function initialName(initialCategory: Category | null | undefined): string {
  return initialCategory === null || initialCategory === undefined ? '' : initialCategory.name
}

function initialExpiry(initialCategory: Category | null | undefined): string {
  return initialCategory === null || initialCategory === undefined
    ? ''
    : String(initialCategory.expiryAlertDays)
}

function hasName(name: string): boolean {
  return name.trim().length > 0
}

function isExpiryValid(expiry: string): boolean {
  const num = parseInt(expiry)
  return !isNaN(num) && num >= 0 && num <= 9999
}

function isFormReady(name: string, expiry: string): boolean {
  return hasName(name) && isExpiryValid(expiry)
}

function formTitle(initialCategory: Category | null | undefined): string {
  return initialCategory ? 'Editar categoría' : 'Nueva categoría'
}

function formAction(initialCategory: Category | null | undefined): string {
  return initialCategory ? 'actualizar' : 'agregar'
}

async function submitForm(
  name: string,
  expiry: string,
  onSubmit: (input: CategoryInput) => Promise<void>,
  setError: (error: string | null) => void,
  setIsSubmitting: (isSubmitting: boolean) => void,
) {
  setError(null)

  const trimmedName = name.trim()
  const parsed = categoryInputSchema.safeParse({ name: trimmedName, expiryAlertDays: parseInt(expiry) })

  if (!parsed.success) {
    setError(parsed.error.issues[0]?.message ?? 'Datos inválidos')
    return
  }

  setIsSubmitting(true)

  try {
    await onSubmit(parsed.data)
  } catch {
    // Error already handled by parent
  } finally {
    setIsSubmitting(false)
  }
}

export function CategoryForm({ initialCategory, onSubmit, onCancel, submitLabel }: Props) {
  const [name, setName] = useState(initialName(initialCategory))
  const [expiryAlertDays, setExpiryAlertDays] = useState(initialExpiry(initialCategory))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFormValid = isFormReady(name, expiryAlertDays)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitForm(name, expiryAlertDays, onSubmit, setError, setIsSubmitting)
  }

  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">{formTitle(initialCategory)}</h2>
      <p className="mt-1 text-sm text-stone-600">
        Complete los campos para {formAction(initialCategory)} la categoría.
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="category-name" className="block text-sm font-medium text-stone-800">
            Nombre
          </label>
          <input
            id="category-name"
            className={fieldClasses}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            aria-invalid={!!error}
          />
        </div>

        <div>
          <label htmlFor="category-expiry" className="block text-sm font-medium text-stone-800">
            Días de alerta
          </label>
          <input
            id="category-expiry"
            className={fieldClasses}
            type="number"
            min="0"
            value={expiryAlertDays}
            onChange={(event) => setExpiryAlertDays(event.target.value)}
            required
            aria-invalid={!!error}
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-lg bg-white px-5 font-medium text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-lg bg-amber-600 px-5 font-medium text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-60"
            disabled={isSubmitting || !isFormValid}
          >
            {isSubmitting ? 'Guardando…' : submitLabel}
          </button>
        </div>
      </form>
    </section>
  )
}
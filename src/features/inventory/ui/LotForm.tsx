import { useState, type FormEvent } from 'react'

import type { AppError, Cents, Id, IsoDate, Result } from '../../../contracts/common'
import type { Lot, Product } from '../../../contracts/entities'

export type NewLotInput = {
  productId: Id
  quantity: number
  expiryDate: IsoDate
  unitCostCents: Cents
}

type Props = {
  products: Product[]
  onSubmit: (input: NewLotInput) => Promise<Result<Lot>>
}

const fieldClasses =
  'mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-base ' +
  'focus:border-amber-600 focus:outline-2 focus:outline-offset-1 focus:outline-amber-600'

const buttonClasses =
  'min-h-11 rounded-lg bg-amber-600 px-5 font-medium text-white hover:bg-amber-700 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 ' +
  'disabled:opacity-60'

export function LotForm({ products, onSubmit }: Props) {
  const activeProducts = products.filter((product) => product.active)
  const [productId, setProductId] = useState(() => activeProducts[0]?.id ?? '')
  const [quantityText, setQuantityText] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [costText, setCostText] = useState('')
  const [error, setError] = useState<AppError | null>(null)
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)

    const quantity = Number(quantityText)
    if (!productId) {
      setError(invalidFormError('Elige el producto que llegó al local.'))
      return
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError(invalidFormError('Escribe una cantidad entera mayor que cero.'))
      return
    }
    if (!isIsoDate(expiryDate)) {
      setError(invalidFormError('Escribe la fecha de vencimiento con el formato AAAA-MM-DD.'))
      return
    }

    const unitCostCents = parseCents(costText)
    if (unitCostCents === null) {
      setError(invalidFormError('Escribe el costo unitario en bolivianos. Ejemplo: 12,50.'))
      return
    }

    setIsSaving(true)
    try {
      const result = await onSubmit({ productId, quantity, expiryDate, unitCostCents })
      if (!result.ok) {
        setError(result.error)
        return
      }

      setSaved(true)
      setQuantityText('')
      setExpiryDate('')
      setCostText('')
    } catch {
      setError(deviceError())
    } finally {
      setIsSaving(false)
    }
  }

  if (activeProducts.length === 0) {
    return (
      <p className="rounded-xl bg-white p-4 text-stone-700 shadow-sm">
        No hay productos activos para registrar un ingreso.
      </p>
    )
  }

  return (
    <section aria-labelledby="lot-form-title" className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 id="lot-form-title" className="text-lg font-semibold text-stone-900">
        Registrar ingreso
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        La mercadería entra al inventario como un lote con su propio vencimiento.
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="lot-form-product" className="block text-sm font-medium text-stone-800">
            Producto
          </label>
          <select
            id="lot-form-product"
            className={fieldClasses}
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            {activeProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lot-form-quantity" className="block text-sm font-medium text-stone-800">
            Cantidad
          </label>
          <input
            id="lot-form-quantity"
            className={fieldClasses}
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={quantityText}
            onChange={(event) => setQuantityText(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="lot-form-expiry" className="block text-sm font-medium text-stone-800">
            Fecha de vencimiento
          </label>
          <input
            id="lot-form-expiry"
            className={fieldClasses}
            type="date"
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="lot-form-cost" className="block text-sm font-medium text-stone-800">
            Costo unitario (Bs)
          </label>
          <input
            id="lot-form-cost"
            className={fieldClasses}
            type="text"
            inputMode="decimal"
            placeholder="12,50"
            aria-describedby="lot-form-cost-hint"
            value={costText}
            onChange={(event) => setCostText(event.target.value)}
          />
          <p id="lot-form-cost-hint" className="mt-1 text-xs text-stone-500">
            Escríbelo en bolivianos, con hasta dos decimales.
          </p>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error.what} {error.why} {error.how}
          </p>
        ) : null}

        {saved ? (
          <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
            Ingreso registrado.
          </p>
        ) : null}

        <button type="submit" disabled={isSaving} className={`${buttonClasses} w-full`}>
          {isSaving ? 'Guardando…' : 'Registrar ingreso'}
        </button>
      </form>
    </section>
  )
}

function parseCents(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const [wholeText, fractionText = ''] = normalized.split('.')
  const whole = Number(wholeText)
  if (!Number.isSafeInteger(whole)) return null

  return whole * 100 + Number(fractionText.padEnd(2, '0'))
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === (month ?? 1) - 1 &&
    date.getUTCDate() === day
  )
}

function invalidFormError(why: string): AppError {
  return {
    code: 'INVALID_LOT_FORM',
    what: 'No se pudo registrar el ingreso.',
    why,
    how: 'Revisa los datos del lote y vuelve a intentarlo.',
  }
}

function deviceError(): AppError {
  return {
    code: 'INVENTORY_SAVE_FAILED',
    what: 'No se pudo registrar el ingreso.',
    why: 'El dispositivo no respondió al guardar el inventario.',
    how: 'Revisa el espacio libre del teléfono o la tablet y vuelve a intentarlo.',
  }
}

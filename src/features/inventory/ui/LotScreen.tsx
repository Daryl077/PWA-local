import { useEffect, useState, type FormEvent } from 'react'

import type { AppError, Id, IsoDate, Result } from '../../../contracts/common'
import type { Lot, Product, WasteReason } from '../../../contracts/entities'
import type { Action, AuthService, InventoryService } from '../../../contracts/services'
import { LotForm, type NewLotInput } from './LotForm'
import { LotList } from './LotList'

// El contrato vigente usa estos nombres (docs/CONTRATOS.md).
const RECEIVE_LOT: Action = 'receive_lot'
const REGISTER_WASTE: Action = 'registerwaste'
const ADJUST_STOCK: Action = 'adjust_stock'
const VIEW_COSTS: Action = 'view_costs'

export type LotScreenProps = {
  inventoryService: InventoryService
  auth: Pick<AuthService, 'can' | 'currentUser'>
  products: Product[]
  today: IsoDate
  loadLots: (productId: Id) => Promise<Lot[]>
}

type ActionSelection = { mode: 'waste' | 'adjust'; lot: Lot }

type LotScreenBodyProps = {
  availableProducts: Product[]
  selectedProductId: Id
  selectedProduct: Product | undefined
  stock: number | null
  lots: Lot[] | null
  expiringLotIds: ReadonlySet<Id>
  isLoading: boolean
  loadError: AppError | null
  canReceive: boolean
  canWaste: boolean
  canAdjust: boolean
  canViewCosts: boolean
  action: ActionSelection | null
  actionError: AppError | null
  today: IsoDate
  onProductChange: (productId: Id) => void
  onReceive: (input: NewLotInput) => Promise<Result<Lot>>
  onWaste: (lot: Lot, quantity: number, reason: WasteReason) => void
  onAdjust: (lot: Lot, delta: number, reason: string) => void
  onSelectAction: (selection: ActionSelection | null) => void
  onClearActionError: () => void
}

const selectClasses =
  'mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-base ' +
  'focus:border-amber-600 focus:outline-2 focus:outline-offset-1 focus:outline-amber-600'

const dateFormatter = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/La_Paz',
})

export function LotScreen({ inventoryService, auth, products, today, loadLots }: LotScreenProps) {
  const availableProducts = products.filter((product) => product.active)
  const [selectedProductId, setSelectedProductId] = useState(
    () => availableProducts[0]?.id ?? '',
  )
  const [stock, setStock] = useState<number | null>(null)
  const [lots, setLots] = useState<Lot[] | null>(null)
  const [expiringLotIds, setExpiringLotIds] = useState<ReadonlySet<Id>>(new Set())
  const [loadError, setLoadError] = useState<AppError | null>(null)
  const [action, setAction] = useState<ActionSelection | null>(null)
  const [actionError, setActionError] = useState<AppError | null>(null)

  const selectedProduct = availableProducts.find((product) => product.id === selectedProductId)
  const isLoading = isInventoryLoading(selectedProduct, stock, lots, loadError)

  useEffect(() => {
    if (!selectedProductId) return

    let active = true

    void (async () => {
      try {
        const [nextStock, expiringLots, productLots] = await Promise.all([
          inventoryService.getStock(selectedProductId, today),
          inventoryService.listExpiringLots(today),
          loadLots(selectedProductId),
        ])

        if (!active) return

        setStock(nextStock)
        setLots(productLots)
        setExpiringLotIds(expiringIdsFor(expiringLots, selectedProductId))
      } catch {
        if (active) setLoadError(loadInventoryError())
      }
    })()

    return () => {
      active = false
    }
  }, [inventoryService, loadLots, selectedProductId, today])

  function handleProductChange(productId: Id) {
    setSelectedProductId(productId)
    setStock(null)
    setLots(null)
    setExpiringLotIds(new Set())
    setLoadError(null)
    setAction(null)
    setActionError(null)
  }

  async function refreshSummary(productId: Id): Promise<void> {
    try {
      const [nextStock, expiringLots] = await Promise.all([
        inventoryService.getStock(productId, today),
        inventoryService.listExpiringLots(today),
      ])

      if (productId !== selectedProductId) return

      setStock(nextStock)
      setExpiringLotIds(expiringIdsFor(expiringLots, productId))
    } catch {
      setLoadError(loadInventoryError())
    }
  }

  async function handleReceive(input: NewLotInput): Promise<Result<Lot>> {
    const userId = auth.currentUser()?.id
    if (!userId) return { ok: false, error: notAuthenticatedError() }

    try {
      const result = await inventoryService.receiveLot({ ...input, userId })
      if (!result.ok) return result

      if (input.productId === selectedProductId) {
        setLots((current) => [result.value, ...(current ?? [])])
      }
      await refreshSummary(input.productId)

      return result
    } catch {
      return { ok: false, error: saveMovementError() }
    }
  }

  async function handleWaste(lot: Lot, quantity: number, reason: WasteReason): Promise<void> {
    const error = await runMovement(auth, (userId) =>
      inventoryService.registerWaste({ lotId: lot.id, quantity, reason, userId }),
    )
    if (error) {
      setActionError(error)
      return
    }

    setAction(null)
    setActionError(null)
    await refreshSummary(lot.productId)
  }

  async function handleAdjust(lot: Lot, delta: number, reason: string): Promise<void> {
    const error = await runMovement(auth, (userId) =>
      inventoryService.adjustStock({ lotId: lot.id, delta, reason, userId }),
    )
    if (error) {
      setActionError(error)
      return
    }

    setAction(null)
    setActionError(null)
    await refreshSummary(lot.productId)
  }

  return (
    <LotScreenBody
      availableProducts={availableProducts}
      selectedProductId={selectedProductId}
      selectedProduct={selectedProduct}
      stock={stock}
      lots={lots}
      expiringLotIds={expiringLotIds}
      isLoading={isLoading}
      loadError={loadError}
      canReceive={auth.can(RECEIVE_LOT)}
      canWaste={auth.can(REGISTER_WASTE)}
      canAdjust={auth.can(ADJUST_STOCK)}
      canViewCosts={auth.can(VIEW_COSTS)}
      action={action}
      actionError={actionError}
      today={today}
      onProductChange={handleProductChange}
      onReceive={handleReceive}
      onWaste={(lot, quantity, reason) => {
        void handleWaste(lot, quantity, reason)
      }}
      onAdjust={(lot, delta, reason) => {
        void handleAdjust(lot, delta, reason)
      }}
      onSelectAction={setAction}
      onClearActionError={() => setActionError(null)}
    />
  )
}

function LotScreenBody({
  availableProducts,
  selectedProductId,
  selectedProduct,
  stock,
  lots,
  expiringLotIds,
  isLoading,
  loadError,
  canReceive,
  canWaste,
  canAdjust,
  canViewCosts,
  action,
  actionError,
  today,
  onProductChange,
  onReceive,
  onWaste,
  onAdjust,
  onSelectAction,
  onClearActionError,
}: LotScreenBodyProps) {
  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6">
      <section className="mx-auto max-w-3xl space-y-5">
        <header>
          <p className="text-sm font-semibold tracking-wide text-amber-700 uppercase">Inventario</p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-900">Lotes y mercadería</h1>
          <p className="mt-2 text-stone-600">
            Consulta el stock y los lotes. El Dueño también registra ingresos, mermas y ajustes.
          </p>
        </header>

        {availableProducts.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-stone-700 shadow-sm">
            No hay productos activos para consultar.
          </p>
        ) : (
          <div>
            <label
              htmlFor="lot-screen-product"
              className="block text-sm font-medium text-stone-800"
            >
              Producto a consultar
            </label>
            <select
              id="lot-screen-product"
              className={selectClasses}
              value={selectedProductId}
              onChange={(event) => onProductChange(event.target.value)}
            >
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isLoading ? (
          <p role="status" className="rounded-xl bg-white p-4 text-stone-700 shadow-sm">
            Cargando inventario…
          </p>
        ) : null}

        {loadError ? (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {loadError.what} {loadError.why} {loadError.how}
          </p>
        ) : null}

        {!isLoading && !loadError && selectedProduct ? (
          <ProductInventory
            product={selectedProduct}
            availableProducts={availableProducts}
            stock={stock}
            lots={lots}
            expiringLotIds={expiringLotIds}
            canReceive={canReceive}
            canWaste={canWaste}
            canAdjust={canAdjust}
            canViewCosts={canViewCosts}
            action={action}
            actionError={actionError}
            today={today}
            onReceive={onReceive}
            onWaste={onWaste}
            onAdjust={onAdjust}
            onSelectAction={onSelectAction}
            onClearActionError={onClearActionError}
          />
        ) : null}
      </section>
    </main>
  )
}

function ProductInventory({
  product,
  availableProducts,
  stock,
  lots,
  expiringLotIds,
  canReceive,
  canWaste,
  canAdjust,
  canViewCosts,
  action,
  actionError,
  today,
  onReceive,
  onWaste,
  onAdjust,
  onSelectAction,
  onClearActionError,
}: {
  product: Product
  availableProducts: Product[]
  stock: number | null
  lots: Lot[] | null
  expiringLotIds: ReadonlySet<Id>
  canReceive: boolean
  canWaste: boolean
  canAdjust: boolean
  canViewCosts: boolean
  action: ActionSelection | null
  actionError: AppError | null
  today: IsoDate
  onReceive: (input: NewLotInput) => Promise<Result<Lot>>
  onWaste: (lot: Lot, quantity: number, reason: WasteReason) => void
  onAdjust: (lot: Lot, delta: number, reason: string) => void
  onSelectAction: (selection: ActionSelection | null) => void
  onClearActionError: () => void
}) {
  return (
    <>
      <section aria-labelledby="lot-stock-title" className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 id="lot-stock-title" className="text-lg font-semibold text-stone-900">
          {product.name}
        </h2>
        <p className="mt-2 text-stone-700">Stock disponible: {stock ?? 0} unidades</p>
      </section>

      {canReceive ? <LotForm products={availableProducts} onSubmit={onReceive} /> : null}

      <LotList
        lots={lots ?? []}
        today={today}
        expiringLotIds={expiringLotIds}
        showCosts={canViewCosts}
        canWaste={canWaste}
        canAdjust={canAdjust}
        onWaste={(lot) => {
          onClearActionError()
          onSelectAction({ mode: 'waste', lot })
        }}
        onAdjust={(lot) => {
          onClearActionError()
          onSelectAction({ mode: 'adjust', lot })
        }}
      />

      {action ? (
        <LotActionForm
          key={`${action.mode}-${action.lot.id}`}
          mode={action.mode}
          lot={action.lot}
          error={actionError}
          onCancel={() => {
            onSelectAction(null)
            onClearActionError()
          }}
          onSubmitWaste={(quantity, reason) => onWaste(action.lot, quantity, reason)}
          onSubmitAdjust={(delta, reason) => onAdjust(action.lot, delta, reason)}
        />
      ) : null}
    </>
  )
}

function LotActionForm({
  mode,
  lot,
  error,
  onCancel,
  onSubmitWaste,
  onSubmitAdjust,
}: {
  mode: 'waste' | 'adjust'
  lot: Lot
  error: AppError | null
  onCancel: () => void
  onSubmitWaste: (quantity: number, reason: WasteReason) => void
  onSubmitAdjust: (delta: number, reason: string) => void
}) {
  const [quantityText, setQuantityText] = useState('1')
  const [wasteReason, setWasteReason] = useState<WasteReason>('expired')
  const [deltaText, setDeltaText] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [localError, setLocalError] = useState<AppError | null>(null)
  const displayError = localError ?? error

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)

    if (mode === 'waste') {
      const quantity = Number(quantityText)
      if (!Number.isInteger(quantity) || quantity <= 0) {
        setLocalError(invalidActionError('Escribe una cantidad entera mayor que cero.'))
        return
      }

      onSubmitWaste(quantity, wasteReason)
      return
    }

    const delta = Number(deltaText)
    if (!Number.isInteger(delta) || delta === 0) {
      setLocalError(invalidActionError('Escribe un cambio entero distinto de cero.'))
      return
    }

    const reason = adjustReason.trim()
    if (reason.length < 3) {
      setLocalError(invalidActionError('Escribe un motivo de al menos 3 caracteres.'))
      return
    }

    onSubmitAdjust(delta, reason)
  }

  return (
    <section aria-labelledby="lot-action-title" className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 id="lot-action-title" className="text-lg font-semibold text-stone-900">
        {mode === 'waste' ? 'Registrar merma' : 'Ajustar lote'}
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Lote que vence el {formatDate(lot.expiryDate)}.
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
        {mode === 'waste' ? (
          <>
            <div>
              <label
                htmlFor="lot-action-quantity"
                className="block text-sm font-medium text-stone-800"
              >
                Cantidad de la merma
              </label>
              <input
                id="lot-action-quantity"
                className={selectClasses}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={quantityText}
                onChange={(event) => setQuantityText(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="lot-action-reason" className="block text-sm font-medium text-stone-800">
                Motivo
              </label>
              <select
                id="lot-action-reason"
                className={selectClasses}
                value={wasteReason}
                onChange={(event) => setWasteReason(event.target.value as WasteReason)}
              >
                <option value="expired">Vencido</option>
                <option value="broken">Roto</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="lot-action-delta" className="block text-sm font-medium text-stone-800">
                Cambio de unidades
              </label>
              <input
                id="lot-action-delta"
                className={selectClasses}
                type="number"
                step="1"
                inputMode="numeric"
                aria-describedby="lot-action-delta-hint"
                value={deltaText}
                onChange={(event) => setDeltaText(event.target.value)}
              />
              <p id="lot-action-delta-hint" className="mt-1 text-xs text-stone-500">
                Usa un número negativo para descontar y uno positivo para sumar.
              </p>
            </div>

            <div>
              <label
                htmlFor="lot-action-adjust-reason"
                className="block text-sm font-medium text-stone-800"
              >
                Motivo del ajuste
              </label>
              <input
                id="lot-action-adjust-reason"
                className={selectClasses}
                type="text"
                value={adjustReason}
                onChange={(event) => setAdjustReason(event.target.value)}
              />
            </div>
          </>
        )}

        {displayError ? (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {displayError.what} {displayError.why} {displayError.how}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-amber-600 px-5 font-medium text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            {mode === 'waste' ? 'Guardar merma' : 'Guardar ajuste'}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-stone-300 px-5 font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  )
}

function isInventoryLoading(
  selectedProduct: Product | undefined,
  stock: number | null,
  lots: Lot[] | null,
  loadError: AppError | null,
): boolean {
  return selectedProduct !== undefined && stock === null && lots === null && loadError === null
}

function expiringIdsFor(
  expiringLots: Array<{ lot: Lot }>,
  productId: Id,
): ReadonlySet<Id> {
  return new Set(
    expiringLots
      .filter((item) => item.lot.productId === productId)
      .map((item) => item.lot.id),
  )
}

async function runMovement(
  auth: Pick<AuthService, 'currentUser'>,
  work: (userId: Id) => Promise<Result<unknown>>,
): Promise<AppError | null> {
  const userId = auth.currentUser()?.id
  if (!userId) return notAuthenticatedError()

  try {
    const result = await work(userId)
    return result.ok ? null : result.error
  } catch {
    return saveMovementError()
  }
}

function formatDate(date: IsoDate): string {
  return dateFormatter.format(new Date(`${date}T12:00:00.000Z`))
}

function loadInventoryError(): AppError {
  return {
    code: 'INVENTORY_LOAD_FAILED',
    what: 'No se pudo cargar el inventario.',
    why: 'El dispositivo no respondió al leer los lotes y el stock.',
    how: 'Revisa el espacio libre del teléfono o la tablet y vuelve a intentarlo.',
  }
}

function saveMovementError(): AppError {
  return {
    code: 'INVENTORY_SAVE_FAILED',
    what: 'No se pudo guardar el cambio.',
    why: 'El dispositivo no respondió al guardar el movimiento de stock.',
    how: 'Revisa el espacio libre del teléfono o la tablet y vuelve a intentarlo.',
  }
}

function notAuthenticatedError(): AppError {
  return {
    code: 'NOT_AUTHENTICATED',
    what: 'No se pudo guardar el cambio.',
    why: 'No hay una sesión abierta.',
    how: 'Entra con tu usuario y vuelve a intentarlo.',
  }
}

function invalidActionError(why: string): AppError {
  return {
    code: 'INVALID_LOT_ACTION',
    what: 'No se pudo guardar el cambio.',
    why,
    how: 'Revisa el dato y vuelve a intentarlo.',
  }
}

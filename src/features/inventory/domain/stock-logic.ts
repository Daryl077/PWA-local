import type { AppError, Id, IsoDate, Result } from '../../../contracts/common'
import type { Lot, StockMovement } from '../../../contracts/entities'
import type { LotAllocation } from '../../../contracts/services'
import { isLotExpired, type LotStock } from './lot'
import { positiveQuantitySchema } from './stock-movement'

/**
 * Stock de un lote: ingresos menos ventas y mermas, más los ajustes (R-01).
 * Solo lee movimientos: no los edita ni los borra.
 */
export function getLotStock(movements: readonly StockMovement[], lotId: Id): number {
  return movements.reduce((stock, movement) => {
    if (movement.lotId !== lotId) return stock

    switch (movement.type) {
      case 'receipt':
        return stock + movement.quantity
      case 'sale':
        return stock - movement.quantity
      case 'waste':
        return stock - movement.quantity
      case 'adjustment':
        return stock + movement.delta
    }
  }, 0)
}

/**
 * Lotes de un producto que todavía se pueden vender, del vencimiento más
 * próximo al más lejano (PEPS). Los vencidos y los que quedaron en cero no
 * aparecen (R-01 y R-02).
 */
export function listAvailableLots(
  lots: readonly Lot[],
  movements: readonly StockMovement[],
  productId: Id,
  today: IsoDate,
): LotStock[] {
  return lots
    .filter((lot) => lot.productId === productId && !isLotExpired(lot, today))
    .map((lot) => ({ ...lot, quantity: getLotStock(movements, lot.id) }))
    .filter((lotStock) => lotStock.quantity > 0)
    .sort(compareByExpiry)
}

/** Stock disponible de un producto: solo lotes no vencidos con unidades (R-02). */
export function getAvailableStock(
  lots: readonly Lot[],
  movements: readonly StockMovement[],
  productId: Id,
  today: IsoDate,
): number {
  return listAvailableLots(lots, movements, productId, today).reduce(
    (total, lotStock) => total + lotStock.quantity,
    0,
  )
}

/**
 * Reparte una venta entre lotes por PEPS (R-01). Si no alcanza el stock no
 * vencido, rechaza la venta completa con `INSUFFICIENT_STOCK` (R-04).
 */
export function allocateLotsForSale(
  lots: readonly Lot[],
  movements: readonly StockMovement[],
  productId: Id,
  quantity: number,
  today: IsoDate,
): Result<LotAllocation[]> {
  const parsed = positiveQuantitySchema.safeParse(quantity)
  if (!parsed.success) {
    return { ok: false, error: invalidQuantityError(parsed.error.issues[0]?.message) }
  }

  const availableLots = listAvailableLots(lots, movements, productId, today)
  const available = availableLots.reduce((total, lotStock) => total + lotStock.quantity, 0)
  if (available < parsed.data) {
    return { ok: false, error: insufficientStockError(available, parsed.data) }
  }

  const allocations: LotAllocation[] = []
  let remaining = parsed.data

  for (const lotStock of availableLots) {
    if (remaining === 0) break

    const taken = Math.min(lotStock.quantity, remaining)
    allocations.push({ lotId: lotStock.id, quantity: taken, unitCostCents: lotStock.unitCostCents })
    remaining -= taken
  }

  return { ok: true, value: allocations }
}

function compareByExpiry(left: Lot, right: Lot): number {
  const byExpiry = left.expiryDate.localeCompare(right.expiryDate)
  if (byExpiry !== 0) return byExpiry

  const byReceipt = left.receivedAt.localeCompare(right.receivedAt)
  if (byReceipt !== 0) return byReceipt

  return left.id.localeCompare(right.id)
}

function invalidQuantityError(detail: string | undefined): AppError {
  return {
    code: 'INVALID_SALE_QUANTITY',
    what: 'No se pudo preparar la venta.',
    why: detail ?? 'La cantidad vendida no es válida.',
    how: 'Escribe una cantidad entera mayor que cero.',
  }
}

function insufficientStockError(available: number, requested: number): AppError {
  return {
    code: 'INSUFFICIENT_STOCK',
    what: 'Stock insuficiente.',
    why: `Quedan ${available} unidades y quieres vender ${requested}.`,
    how: 'Revisa el inventario o pide un ajuste al dueño.',
  }
}

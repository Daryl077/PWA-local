import { describe, expect, it } from 'vitest'

import type { Id, Result } from '../../../contracts/common'
import type { Lot, StockMovement } from '../../../contracts/entities'
import type { LotAllocation } from '../../../contracts/services'
import {
  allocateLotsForSale,
  getAvailableStock,
  getLotStock,
  listAvailableLots,
} from './stock-logic'
import {
  createAdjustmentMovement,
  createReceiptMovement,
  createSaleMovement,
} from './stock-movement'

const lotA: Lot = {
  id: 'lot-a',
  productId: 'cerveza-620',
  expiryDate: '2026-12-10',
  unitCostCents: 900,
  receivedAt: '2026-11-01T10:00:00.000Z',
}

const lotB: Lot = {
  id: 'lot-b',
  productId: 'cerveza-620',
  expiryDate: '2026-12-05',
  unitCostCents: 800,
  receivedAt: '2026-11-02T10:00:00.000Z',
}

const TODAY = '2026-11-20'

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.why)
  return result.value
}

function findLot(lots: readonly Lot[], lotId: Id): Lot {
  const lot = lots.find((candidate) => candidate.id === lotId)
  if (!lot) throw new Error(`Falta el lote ${lotId}`)
  return lot
}

function receipt(lot: Lot, quantity: number, id: string): StockMovement {
  return unwrap(
    createReceiptMovement({
      id,
      lot,
      quantity,
      userId: 'user-1',
      occurredAt: '2026-11-10T10:00:00.000Z',
    }),
  )
}

function sale(
  lots: readonly Lot[],
  allocation: LotAllocation,
  saleId: string,
  id: string,
): StockMovement {
  return unwrap(
    createSaleMovement({
      id,
      lot: findLot(lots, allocation.lotId),
      quantity: allocation.quantity,
      saleId,
      userId: 'user-1',
      occurredAt: '2026-11-20T10:00:00.000Z',
    }),
  )
}

describe('stock por lote y por producto', () => {
  it('calcula el stock del producto sumando sus lotes (R-01)', () => {
    const lots = [lotA, lotB]
    const movements = [receipt(lotA, 5, 'mov-a'), receipt(lotB, 2, 'mov-b')]

    expect(getAvailableStock(lots, movements, 'cerveza-620', TODAY)).toBe(7)
    expect(getLotStock(movements, lotA.id)).toBe(5)
    expect(getLotStock(movements, lotB.id)).toBe(2)
  })

  it('aplica ventas, mermas y ajustes al stock del lote (RF-INV-02)', () => {
    const adjustment = unwrap(
      createAdjustmentMovement({
        id: 'mov-adjust',
        lot: lotA,
        delta: -2,
        reason: 'Conteo físico',
        userId: 'user-1',
        occurredAt: '2026-11-15T10:00:00.000Z',
      }),
    )
    const movements = [receipt(lotA, 10, 'mov-a'), adjustment]

    expect(getLotStock(movements, lotA.id)).toBe(8)
    expect(getAvailableStock([lotA], movements, lotA.productId, TODAY)).toBe(8)
  })
})

describe('allocateLotsForSale con PEPS', () => {
  it('descuenta primero del lote con vencimiento más próximo (R-01)', () => {
    const lots = [lotA, lotB]
    const movements = [receipt(lotA, 5, 'mov-a'), receipt(lotB, 2, 'mov-b')]

    const allocations = unwrap(allocateLotsForSale(lots, movements, 'cerveza-620', 3, TODAY))

    expect(allocations).toEqual([
      { lotId: 'lot-b', quantity: 2, unitCostCents: 800 },
      { lotId: 'lot-a', quantity: 1, unitCostCents: 900 },
    ])
  })

  it('deja los movimientos de venta registrados por cada lote (R-01)', () => {
    const lots = [lotA, lotB]
    const receipts = [receipt(lotA, 5, 'mov-a'), receipt(lotB, 2, 'mov-b')]
    const allocations = unwrap(allocateLotsForSale(lots, receipts, 'cerveza-620', 3, TODAY))

    const sales = allocations.map((allocation, index) =>
      sale(lots, allocation, 'sale-1', `sale-mov-${index}`),
    )
    const movements = [...receipts, ...sales]

    expect(sales).toHaveLength(2)
    expect(sales.map((movement) => movement.lotId)).toEqual(['lot-b', 'lot-a'])
    expect(getLotStock(movements, 'lot-b')).toBe(0)
    expect(getLotStock(movements, 'lot-a')).toBe(4)
    expect(getAvailableStock(lots, movements, 'cerveza-620', TODAY)).toBe(4)
  })
})

describe('lotes vencidos', () => {
  it('no ofrece lotes vencidos para vender (R-02)', () => {
    const lots = [lotA, lotB]
    const movements = [receipt(lotA, 5, 'mov-a'), receipt(lotB, 2, 'mov-b')]

    const available = listAvailableLots(lots, movements, 'cerveza-620', '2026-12-06')

    expect(available.map((lotStock) => lotStock.id)).toEqual(['lot-a'])
    expect(getAvailableStock(lots, movements, 'cerveza-620', '2026-12-06')).toBe(5)
  })

  it('falla con INSUFFICIENT_STOCK si todo el stock restante está vencido (R-02)', () => {
    const movements = [receipt(lotB, 2, 'mov-b')]

    const result = allocateLotsForSale([lotB], movements, 'cerveza-620', 1, '2026-12-06')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('INSUFFICIENT_STOCK')
    expect(result.error.why).toContain('Quedan 0 unidades')
  })
})

describe('venta sin stock suficiente', () => {
  it('rechaza la venta completa y explica cuánto queda (R-04)', () => {
    const lots = [lotA, lotB]
    const movements = [receipt(lotA, 5, 'mov-a'), receipt(lotB, 2, 'mov-b')]

    const result = allocateLotsForSale(lots, movements, 'cerveza-620', 8, TODAY)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('INSUFFICIENT_STOCK')
    expect(result.error.why).toBe('Quedan 7 unidades y quieres vender 8.')
    expect(result.error.how).toBe('Revisa el inventario o pide un ajuste al dueño.')
  })

  it('rechaza cantidades que no son enteros positivos', () => {
    const movements = [receipt(lotA, 5, 'mov-a')]

    expect(allocateLotsForSale([lotA], movements, 'cerveza-620', 0, TODAY).ok).toBe(false)
    expect(allocateLotsForSale([lotA], movements, 'cerveza-620', 1.5, TODAY).ok).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import type { Result } from '../../../contracts/common'
import type { Lot } from '../../../contracts/entities'
import * as stockMovement from './stock-movement'
import {
  createAdjustmentMovement,
  createReceiptMovement,
  createSaleMovement,
  createWasteMovement,
} from './stock-movement'

const lot: Lot = {
  id: 'lot-a',
  productId: 'cerveza-620',
  expiryDate: '2026-12-10',
  unitCostCents: 800,
  receivedAt: '2026-11-01T10:00:00.000Z',
}

const base = {
  lot,
  userId: 'user-1',
  occurredAt: '2026-11-16T12:00:00.000Z',
}

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.why)
  return result.value
}

describe('StockMovement de ingreso', () => {
  it('registra las unidades que entran al lote (RF-INV-02)', () => {
    const movement = unwrap(createReceiptMovement({ ...base, id: 'mov-1', quantity: 5 }))

    expect(movement).toEqual({
      id: 'mov-1',
      productId: 'cerveza-620',
      lotId: 'lot-a',
      occurredAt: '2026-11-16T12:00:00.000Z',
      userId: 'user-1',
      type: 'receipt',
      quantity: 5,
    })
  })

  it('rechaza cantidades que no son enteros positivos', () => {
    expect(createReceiptMovement({ ...base, id: 'mov-1', quantity: 0 }).ok).toBe(false)
    expect(createReceiptMovement({ ...base, id: 'mov-1', quantity: 2.5 }).ok).toBe(false)
  })
})

describe('StockMovement de venta', () => {
  it('referencia el lote del que salió el stock y la venta (RF-INV-02)', () => {
    const movement = unwrap(
      createSaleMovement({ ...base, id: 'mov-2', quantity: 2, saleId: 'sale-1' }),
    )

    expect(movement.type).toBe('sale')
    expect(movement.lotId).toBe('lot-a')
    expect(movement.saleId).toBe('sale-1')
    expect(movement.quantity).toBe(2)
  })

  it('exige el identificador de la venta', () => {
    const result = createSaleMovement({ ...base, id: 'mov-2', quantity: 2, saleId: '' })

    expect(result.ok).toBe(false)
  })
})

describe('StockMovement de merma', () => {
  it('registra motivo y pérdida con el costo del lote (R-06)', () => {
    const movement = unwrap(
      createWasteMovement({ ...base, id: 'mov-3', quantity: 2, reason: 'expired' }),
    )

    expect(movement.type).toBe('waste')
    expect(movement.reason).toBe('expired')
    expect(movement.lossCents).toBe(1600)
    expect(movement.quantity).toBe(2)
  })

  it('rechaza un motivo fuera del catálogo', () => {
    // @ts-expect-error El motivo debe ser expired, broken u other.
    const result = createWasteMovement({ ...base, id: 'mov-3', quantity: 1, reason: 'roto' })

    expect(result.ok).toBe(false)
  })
})

describe('StockMovement de ajuste', () => {
  it('registra un delta positivo o negativo con su motivo (RF-INV-05)', () => {
    const movement = unwrap(
      createAdjustmentMovement({
        ...base,
        id: 'mov-4',
        delta: -3,
        reason: 'Conteo físico del turno',
      }),
    )

    expect(movement.type).toBe('adjustment')
    expect(movement.delta).toBe(-3)
    expect(movement.reason).toBe('Conteo físico del turno')
  })

  it('rechaza un ajuste que no cambia la cantidad', () => {
    const result = createAdjustmentMovement({
      ...base,
      id: 'mov-4',
      delta: 0,
      reason: 'Sin cambios',
    })

    expect(result.ok).toBe(false)
  })

  it('exige un motivo explicativo', () => {
    const result = createAdjustmentMovement({ ...base, id: 'mov-4', delta: 1, reason: '  ' })

    expect(result.ok).toBe(false)
  })
})

describe('movimientos inmutables y append-only', () => {
  it('congela el movimiento para que no se pueda editar', () => {
    const movement = unwrap(createReceiptMovement({ ...base, id: 'mov-1', quantity: 5 }))

    expect(Object.isFrozen(movement)).toBe(true)
    expect(Reflect.set(movement, 'quantity', 99)).toBe(false)
    expect(movement.quantity).toBe(5)
  })

  it('no expone funciones para editar ni borrar movimientos', () => {
    const names = Object.keys(stockMovement)

    expect(names.some((name) => /update|edit|delete|remove/i.test(name))).toBe(false)
  })
})

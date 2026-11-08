import { describe, expect, it } from 'vitest'

import {
  adjustStockInputSchema,
  categoryInputSchema,
  productInputSchema,
  receiveLotInputSchema,
  registerWasteInputSchema,
  stockMovementInputSchema,
} from './schemas'

const validCategory = { name: 'Cervezas', expiryAlertDays: 30 }

const validProduct = {
  name: 'Cerveza 620 ml',
  categoryId: 'category-1',
  priceCents: 1500,
  costCents: 900,
  minStock: 6,
}

const validLot = {
  productId: 'product-1',
  quantity: 12,
  expiryDate: '2026-12-31',
  unitCostCents: 800,
  userId: 'user-1',
}

const validWaste = {
  lotId: 'lot-1',
  quantity: 2,
  reason: 'broken',
  userId: 'user-1',
}

const movementBase = {
  id: 'movement-1',
  productId: 'product-1',
  lotId: 'lot-1',
  occurredAt: '2026-11-08T12:00:00.000Z',
  userId: 'user-1',
}

describe('categoryInputSchema', () => {
  it('acepta una categoría válida y recorta el nombre', () => {
    const result = categoryInputSchema.parse({ ...validCategory, name: '  Cervezas  ' })

    expect(result.name).toBe('Cervezas')
    expect(result.expiryAlertDays).toBe(30)
  })

  it('rechaza un nombre demasiado corto con un mensaje útil', () => {
    const result = categoryInputSchema.safeParse({ ...validCategory, name: 'A' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/corto/i)
    }
  })

  it('rechaza días de alerta negativos', () => {
    const result = categoryInputSchema.safeParse({ ...validCategory, expiryAlertDays: -1 })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/negativ/i)
    }
  })

  it('rechaza días de alerta con decimales', () => {
    expect(categoryInputSchema.safeParse({ ...validCategory, expiryAlertDays: 1.5 }).success).toBe(
      false,
    )
  })
})

describe('productInputSchema', () => {
  it('acepta un producto válido y aplica los valores por defecto', () => {
    const result = productInputSchema.parse(validProduct)

    expect(result.isFavorite).toBe(false)
    expect(result.active).toBe(true)
  })

  it('rechaza un precio negativo', () => {
    const result = productInputSchema.safeParse({ ...validProduct, priceCents: -1 })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/negativ/i)
    }
  })

  it('rechaza un costo negativo', () => {
    const result = productInputSchema.safeParse({ ...validProduct, costCents: -1 })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/negativ/i)
    }
  })

  it('rechaza un stock mínimo negativo', () => {
    expect(productInputSchema.safeParse({ ...validProduct, minStock: -1 }).success).toBe(false)
  })

  it('rechaza un producto sin categoría', () => {
    const result = productInputSchema.safeParse({ ...validProduct, categoryId: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/obligatori/i)
    }
  })
})

describe('receiveLotInputSchema', () => {
  it('acepta un lote válido', () => {
    expect(receiveLotInputSchema.safeParse(validLot).success).toBe(true)
  })

  it('rechaza cantidad cero o negativa', () => {
    expect(receiveLotInputSchema.safeParse({ ...validLot, quantity: 0 }).success).toBe(false)
    expect(receiveLotInputSchema.safeParse({ ...validLot, quantity: -2 }).success).toBe(false)
  })

  it('rechaza una fecha con formato incorrecto', () => {
    const result = receiveLotInputSchema.safeParse({ ...validLot, expiryDate: '31/12/2026' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/fecha.*válida|formato/i)
    }
  })

  it('rechaza una fecha que no existe en el calendario', () => {
    expect(receiveLotInputSchema.safeParse({ ...validLot, expiryDate: '2026-02-30' }).success).toBe(
      false,
    )
  })

  it('rechaza un lote sin usuario', () => {
    expect(receiveLotInputSchema.safeParse({ ...validLot, userId: '' }).success).toBe(false)
  })
})

describe('registerWasteInputSchema', () => {
  it('acepta una merma válida', () => {
    expect(registerWasteInputSchema.safeParse(validWaste).success).toBe(true)
  })

  it('rechaza un motivo que no existe', () => {
    const result = registerWasteInputSchema.safeParse({ ...validWaste, reason: 'roto' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/motivo/i)
    }
  })

  it('rechaza cantidad cero', () => {
    expect(registerWasteInputSchema.safeParse({ ...validWaste, quantity: 0 }).success).toBe(false)
  })
})

describe('adjustStockInputSchema', () => {
  it('acepta ajustes positivos y negativos', () => {
    expect(
      adjustStockInputSchema.safeParse({
        lotId: 'lot-1',
        delta: -2,
        reason: 'Conteo físico',
        userId: 'user-1',
      }).success,
    ).toBe(true)
  })

  it('rechaza un ajuste de cero', () => {
    const result = adjustStockInputSchema.safeParse({
      lotId: 'lot-1',
      delta: 0,
      reason: 'Conteo físico',
      userId: 'user-1',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/cero/i)
    }
  })

  it('rechaza un motivo demasiado corto', () => {
    expect(
      adjustStockInputSchema.safeParse({
        lotId: 'lot-1',
        delta: 1,
        reason: '  ',
        userId: 'user-1',
      }).success,
    ).toBe(false)
  })
})

describe('stockMovementInputSchema', () => {
  it('acepta un movimiento de ingreso válido', () => {
    expect(
      stockMovementInputSchema.safeParse({
        ...movementBase,
        type: 'receipt',
        quantity: 12,
      }).success,
    ).toBe(true)
  })

  it('rechaza una venta sin saleId', () => {
    const result = stockMovementInputSchema.safeParse({
      ...movementBase,
      type: 'sale',
      quantity: 1,
    })

    expect(result.success).toBe(false)
  })

  it('acepta una venta con saleId', () => {
    expect(
      stockMovementInputSchema.safeParse({
        ...movementBase,
        type: 'sale',
        quantity: 1,
        saleId: 'sale-1',
      }).success,
    ).toBe(true)
  })

  it('rechaza una merma con motivo inválido', () => {
    expect(
      stockMovementInputSchema.safeParse({
        ...movementBase,
        type: 'waste',
        quantity: 1,
        reason: 'roto',
        lossCents: 800,
      }).success,
    ).toBe(false)
  })

  it('acepta una merma válida', () => {
    expect(
      stockMovementInputSchema.safeParse({
        ...movementBase,
        type: 'waste',
        quantity: 1,
        reason: 'expired',
        lossCents: 800,
      }).success,
    ).toBe(true)
  })

  it('rechaza un ajuste con delta cero', () => {
    const result = stockMovementInputSchema.safeParse({
      ...movementBase,
      type: 'adjustment',
      delta: 0,
      reason: 'Conteo físico',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/cero/i)
    }
  })

  it('rechaza un ajuste sin motivo', () => {
    expect(
      stockMovementInputSchema.safeParse({
        ...movementBase,
        type: 'adjustment',
        delta: 1,
      }).success,
    ).toBe(false)
  })

  it('rechaza una fecha de movimiento inválida', () => {
    expect(
      stockMovementInputSchema.safeParse({
        ...movementBase,
        occurredAt: 'ayer',
        type: 'receipt',
        quantity: 1,
      }).success,
    ).toBe(false)
  })

  it('rechaza una pérdida negativa', () => {
    expect(
      stockMovementInputSchema.safeParse({
        ...movementBase,
        type: 'waste',
        quantity: 1,
        reason: 'other',
        lossCents: -1,
      }).success,
    ).toBe(false)
  })
})

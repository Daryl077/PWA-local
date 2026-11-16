import { describe, expect, it } from 'vitest'

import type { Lot } from '../../../contracts/entities'
import { createLot, isLotExpired, toLotStock } from './lot'

const lot: Lot = {
  id: 'lot-a',
  productId: 'cerveza-620',
  expiryDate: '2026-12-10',
  unitCostCents: 800,
  receivedAt: '2026-11-01T10:00:00.000Z',
}

describe('createLot', () => {
  it('crea un lote con producto, vencimiento, costo y fecha de ingreso (RF-INV-03)', () => {
    const result = createLot(lot)

    expect(result).toEqual({ ok: true, value: lot })
  })

  it('rechaza una fecha de vencimiento que no existe en el calendario', () => {
    const result = createLot({ ...lot, expiryDate: '2026-02-30' })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('INVALID_LOT')
    expect(result.error.why).toContain('calendario')
    expect(result.error.how).not.toBe('')
  })

  it('rechaza un costo unitario negativo o con decimales', () => {
    expect(createLot({ ...lot, unitCostCents: -1 }).ok).toBe(false)
    expect(createLot({ ...lot, unitCostCents: 8.5 }).ok).toBe(false)
  })

  it('rechaza una fecha de ingreso que no está en UTC', () => {
    const result = createLot({ ...lot, receivedAt: '2026-11-01T10:00:00-04:00' })

    expect(result.ok).toBe(false)
  })
})

describe('toLotStock', () => {
  it('agrega al lote la cantidad que queda en stock (RF-INV-02)', () => {
    const result = toLotStock(lot, 5)

    expect(result).toEqual({ ok: true, value: { ...lot, quantity: 5 } })
  })

  it('rechaza una cantidad negativa', () => {
    expect(toLotStock(lot, -1).ok).toBe(false)
  })
})

describe('isLotExpired', () => {
  it('un lote vence cuando su fecha es anterior a hoy (R-02)', () => {
    expect(isLotExpired(lot, '2026-12-11')).toBe(true)
  })

  it('el mismo día del vencimiento todavía se puede vender (R-02)', () => {
    expect(isLotExpired(lot, '2026-12-10')).toBe(false)
  })

  it('un lote con vencimiento futuro no está vencido (R-02)', () => {
    expect(isLotExpired(lot, '2026-11-20')).toBe(false)
  })
})

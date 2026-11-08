import { describe, expect, expectTypeOf, it } from 'vitest'

import { can } from '../auth'
import type { Cents, Id, IsoDate, Result } from '../../contracts/common'
import type { Lot, StockMovement, WasteReason } from '../../contracts/entities'
import type { Action, ExpiringLot, InventoryService, LotAllocation } from '../../contracts/services'
import fakeSource from './fake.ts?raw'
import { createInventoryFake } from './fake'

describe('contrato de InventoryService', () => {
  it('expone solo los métodos acordados', () => {
    expectTypeOf<keyof InventoryService>().toEqualTypeOf<
      | 'getStock'
      | 'allocateForSale'
      | 'listExpiringLots'
      | 'registerWaste'
      | 'receiveLot'
      | 'adjustStock'
    >()
  })

  it('getStock devuelve el stock total del producto (RF-INV-01)', () => {
    expectTypeOf<InventoryService['getStock']>().toEqualTypeOf<
      (productId: Id, today: IsoDate) => Promise<number>
    >()
  })

  it('allocateForSale devuelve las asignaciones de lotes (RF-INV-06)', () => {
    expectTypeOf<InventoryService['allocateForSale']>().toEqualTypeOf<
      (productId: Id, quantity: number, today: IsoDate) => Promise<Result<LotAllocation[]>>
    >()
  })

  it('listExpiringLots devuelve un arreglo directo, sin Result (RF-INV-04)', () => {
    expectTypeOf<ReturnType<InventoryService['listExpiringLots']>>().toEqualTypeOf<
      Promise<ExpiringLot[]>
    >()

    expectTypeOf<ReturnType<InventoryService['listExpiringLots']>>().not.toEqualTypeOf<
      Promise<Result<ExpiringLot[]>>
    >()
  })

  it('receiveLot exige el usuario que registra el lote (RF-INV-02)', () => {
    expectTypeOf<InventoryService['receiveLot']>().toEqualTypeOf<
      (input: {
        productId: Id
        quantity: number
        expiryDate: IsoDate
        unitCostCents: Cents
        userId: Id
      }) => Promise<Result<Lot>>
    >()
  })

  it('registerWaste exige el usuario que registra la merma (RF-INV-05)', () => {
    expectTypeOf<InventoryService['registerWaste']>().toEqualTypeOf<
      (input: {
        lotId: Id
        quantity: number
        reason: WasteReason
        userId: Id
      }) => Promise<Result<StockMovement>>
    >()
  })

  it('adjustStock registra el ajuste con su motivo y usuario (RF-INV-05)', () => {
    expectTypeOf<InventoryService['adjustStock']>().toEqualTypeOf<
      (input: {
        lotId: Id
        delta: number
        reason: string
        userId: Id
      }) => Promise<Result<StockMovement>>
    >()
  })
})

describe('permiso registerwaste', () => {
  it('solo el Dueño puede registrar mermas (RF-SEG-02)', () => {
    expect(can('owner', 'registerwaste')).toBe(true)
    expect(can('seller', 'registerwaste')).toBe(false)
  })

  it('la acción se llama registerwaste, no register_waste', () => {
    expectTypeOf<'registerwaste'>().toMatchTypeOf<Action>()

    // @ts-expect-error La acción del contrato es registerwaste.
    expectTypeOf<'register_waste'>().toMatchTypeOf<Action>()
  })
})

describe('fake en memoria de InventoryService', () => {
  it('implementa el contrato y responde sin depender de Dexie', async () => {
    const fake: InventoryService = createInventoryFake()

    await expect(fake.getStock('product-1', '2026-11-07')).resolves.toBe(0)
    await expect(fake.listExpiringLots('2026-11-07')).resolves.toEqual([])

    const allocation = await fake.allocateForSale('product-1', 1, '2026-11-07')
    const receipt = await fake.receiveLot({
      productId: 'product-1',
      quantity: 1,
      expiryDate: '2026-12-31',
      unitCostCents: 800,
      userId: 'user-1',
    })
    const waste = await fake.registerWaste({
      lotId: 'lot-1',
      quantity: 1,
      reason: 'broken',
      userId: 'user-1',
    })
    const adjustment = await fake.adjustStock({
      lotId: 'lot-1',
      delta: 1,
      reason: 'Conteo físico',
      userId: 'user-1',
    })

    expect(allocation.ok).toBe(false)
    expect(receipt.ok).toBe(false)
    expect(waste.ok).toBe(false)
    expect(adjustment.ok).toBe(false)
  })

  it('no importa Dexie', () => {
    expect(fakeSource).not.toMatch(/from ['"]dexie['"]/)
  })
})

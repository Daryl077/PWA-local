import { describe, expect, expectTypeOf, it } from 'vitest'

import { can } from '../auth'
import type { Cents, Id, IsoDate, Result } from '../../contracts/common'
import type {
  Category,
  Lot,
  Product,
  Role,
  StockMovement,
  WasteReason,
} from '../../contracts/entities'
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
      | 'listCategories'
      | 'createCategory'
      | 'updateCategory'
      | 'deleteCategory'
      | 'listProducts'
      | 'createProduct'
      | 'updateProduct'
      | 'deleteProduct'
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

  it('oculta el costo del lote al Vendedor en las alertas (RF-SEG-02)', () => {
    expectTypeOf<InventoryService['listExpiringLots']>().toEqualTypeOf<
      (today: IsoDate, viewerRole: Role) => Promise<ExpiringLot[]>
    >()

    expectTypeOf<keyof ExpiringLot>().toEqualTypeOf<
      'lotId' | 'productId' | 'productName' | 'expiryDate' | 'daysLeft' | 'unitCostCents'
    >()
    expectTypeOf<ExpiringLot['unitCostCents']>().toEqualTypeOf<Cents | null>()
  })

  it('receiveLot permite confirmar un lote vencido (RF-INV-02)', () => {
    expectTypeOf<InventoryService['receiveLot']>().toEqualTypeOf<
      (input: {
        productId: Id
        quantity: number
        expiryDate: IsoDate
        unitCostCents: Cents
        userId: Id
        acceptExpired?: boolean
      }) => Promise<Result<Lot>>
    >()
  })

  it('registerWaste calcula lossCents y no lo recibe (RF-INV-05)', () => {
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

  it('expone el CRUD de categorías en InventoryService (RF-INV-01)', () => {
    expectTypeOf<InventoryService['listCategories']>().toEqualTypeOf<() => Promise<Category[]>>()
    expectTypeOf<InventoryService['createCategory']>().toEqualTypeOf<
      (input: { name: string; expiryAlertDays: number }) => Promise<Result<Category>>
    >()
    expectTypeOf<InventoryService['updateCategory']>().toEqualTypeOf<
      (input: { id: Id; name?: string; expiryAlertDays?: number }) => Promise<Result<Category>>
    >()
    expectTypeOf<InventoryService['deleteCategory']>().toEqualTypeOf<
      (id: Id) => Promise<Result<void>>
    >()
  })

  it('expone el CRUD de productos en InventoryService (RF-INV-02)', () => {
    expectTypeOf<InventoryService['listProducts']>().toEqualTypeOf<() => Promise<Product[]>>()
    expectTypeOf<InventoryService['createProduct']>().toEqualTypeOf<
      (input: {
        name: string
        categoryId: Id
        priceCents: Cents
        costCents: Cents
        minStock: number
        isFavorite: boolean
        active: boolean
      }) => Promise<Result<Product>>
    >()
    expectTypeOf<InventoryService['updateProduct']>().toEqualTypeOf<
      (input: {
        id: Id
        name?: string
        categoryId?: Id
        priceCents?: Cents
        costCents?: Cents
        minStock?: number
        isFavorite?: boolean
        active?: boolean
      }) => Promise<Result<Product>>
    >()
    expectTypeOf<InventoryService['deleteProduct']>().toEqualTypeOf<
      (id: Id) => Promise<Result<void>>
    >()
  })
})

describe('permiso register_waste', () => {
  it('solo el Dueño puede registrar mermas (RF-SEG-02)', () => {
    expect(can('owner', 'register_waste')).toBe(true)
    expect(can('seller', 'register_waste')).toBe(false)
  })

  it('la acción se llama register_waste, no registerwaste', () => {
    expectTypeOf<'register_waste'>().toMatchTypeOf<Action>()

    // @ts-expect-error La acción del contrato es register_waste.
    expectTypeOf<'registerwaste'>().toMatchTypeOf<Action>()
  })
})

describe('fake en memoria de InventoryService', () => {
  it('implementa el contrato y responde sin depender de Dexie', async () => {
    const fake: InventoryService = createInventoryFake()

    const categories = await fake.listCategories()
    const products = await fake.listProducts()

    await expect(fake.getStock('product-1', '2026-11-07')).resolves.toBe(0)
    await expect(fake.listExpiringLots('2026-11-07', 'seller')).resolves.toEqual([])

    const allocation = await fake.allocateForSale('product-1', 1, '2026-11-07')
    const receipt = await fake.receiveLot({
      productId: 'product-1',
      quantity: 1,
      expiryDate: '2026-12-31',
      unitCostCents: 800,
      userId: 'user-1',
      acceptExpired: true,
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
    const category = await fake.createCategory({ name: 'Cervezas', expiryAlertDays: 30 })
    const updatedCategory = await fake.updateCategory({ id: 'category-1', name: 'Vinos' })
    const deletedCategory = await fake.deleteCategory('category-1')
    const product = await fake.createProduct({
      name: 'Cerveza 620 ml',
      categoryId: 'category-1',
      priceCents: 1500,
      costCents: 900,
      minStock: 6,
      isFavorite: true,
      active: true,
    })
    const updatedProduct = await fake.updateProduct({ id: 'product-1', active: false })
    const deletedProduct = await fake.deleteProduct('product-1')

    expect(categories).toEqual([])
    expect(products).toEqual([])
    expect(allocation.ok).toBe(false)
    expect(receipt.ok).toBe(false)
    expect(waste.ok).toBe(false)
    expect(adjustment.ok).toBe(false)
    expect(category.ok).toBe(false)
    expect(updatedCategory.ok).toBe(false)
    expect(deletedCategory.ok).toBe(false)
    expect(product.ok).toBe(false)
    expect(updatedProduct.ok).toBe(false)
    expect(deletedProduct.ok).toBe(false)
  })

  it('no importa Dexie', () => {
    expect(fakeSource).not.toMatch(/from ['"]dexie['"]/)
  })
})

import { describe, expect, expectTypeOf, it } from 'vitest'

import type { Id } from '../../../contracts/common'
import type {
  CashExpense,
  CashSession,
  Category,
  Lot,
  Product,
  Sale,
  Setting,
  StockMovement,
  UserRecord,
} from '../../../contracts/entities'
import type { InventoryService } from '../../../contracts/services'
import type {
  AppendOnlyRepository,
  Repositories,
  Repository,
  Storage,
} from '../../../contracts/storage'
import { InventoryServiceImpl } from './inventory-service'

const TODAY = '2026-11-20'
const NOW = '2026-11-20T12:00:00.000Z'
const OWNER = 'user-owner'

const CATEGORY: Category = {
  id: 'cat-cervezas',
  name: 'Cervezas',
  expiryAlertDays: 30,
}

const PRODUCT: Product = {
  id: 'prod-cerveza',
  name: 'Cerveza 620 ml',
  categoryId: CATEGORY.id,
  priceCents: 1500,
  costCents: 800,
  minStock: 5,
  isFavorite: false,
  active: true,
}

class MemoryRepository<T extends { id: Id }> implements Repository<T> {
  readonly items: T[] = []
  putCalls = 0

  async get(id: Id): Promise<T | undefined> {
    return this.items.find((item) => item.id === id)
  }

  async list(): Promise<T[]> {
    return [...this.items]
  }

  async put(item: T): Promise<void> {
    this.putCalls += 1

    const index = this.items.findIndex((existing) => existing.id === item.id)
    if (index === -1) this.items.push(item)
    else this.items[index] = item
  }
}

class MemoryAppendOnlyRepository<T extends { id: Id }> implements AppendOnlyRepository<T> {
  readonly items: T[] = []
  addCalls = 0

  async add(item: T): Promise<void> {
    this.addCalls += 1
    this.items.push(item)
  }

  async list(): Promise<T[]> {
    return [...this.items]
  }
}

class MemoryStorage implements Storage {
  readonly users = new MemoryRepository<UserRecord>()
  readonly categories = new MemoryRepository<Category>()
  readonly products = new MemoryRepository<Product>()
  readonly lots = new MemoryRepository<Lot>()
  readonly stockMovements = new MemoryAppendOnlyRepository<StockMovement>()
  readonly sales = new MemoryAppendOnlyRepository<Sale>()
  readonly cashSessions = new MemoryRepository<CashSession>()
  readonly cashExpenses = new MemoryAppendOnlyRepository<CashExpense>()
  readonly settings = new MemoryRepository<Setting>()
  readonly repositories: Repositories
  transactionCalls = 0

  constructor() {
    this.repositories = {
      users: this.users,
      categories: this.categories,
      products: this.products,
      lots: this.lots,
      stockMovements: this.stockMovements,
      sales: this.sales,
      cashSessions: this.cashSessions,
      cashExpenses: this.cashExpenses,
      settings: this.settings,
    }
  }

  transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    this.transactionCalls += 1
    return work(this.repositories)
  }
}

type TestContext = {
  storage: MemoryStorage
  service: InventoryService
}

async function createContext(): Promise<TestContext> {
  const storage = new MemoryStorage()
  await storage.repositories.categories.put(CATEGORY)
  await storage.repositories.products.put(PRODUCT)

  let lastId = 0
  const service = new InventoryServiceImpl(storage, {
    now: () => NOW,
    newId: () => `id-${++lastId}`,
  })

  return { storage, service }
}

async function receive(
  service: InventoryService,
  options: { quantity: number; expiryDate: string; unitCostCents?: number },
): Promise<Lot> {
  const result = await service.receiveLot({
    productId: PRODUCT.id,
    quantity: options.quantity,
    expiryDate: options.expiryDate,
    unitCostCents: options.unitCostCents ?? 800,
    userId: OWNER,
  })

  if (!result.ok) throw new Error(result.error.why)
  return result.value
}

describe('InventoryServiceImpl: contrato', () => {
  it('implementa InventoryService sin cambiar el contrato', async () => {
    const { service } = await createContext()

    expectTypeOf(service).toMatchTypeOf<InventoryService>()
  })
})

describe('receiveLot', () => {
  it('guarda el lote y su movimiento de ingreso en una transacción (RF-INV-03)', async () => {
    const { storage, service } = await createContext()

    const result = await service.receiveLot({
      productId: PRODUCT.id,
      quantity: 5,
      expiryDate: '2026-12-10',
      unitCostCents: 800,
      userId: OWNER,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value).toMatchObject({
      productId: PRODUCT.id,
      expiryDate: '2026-12-10',
      unitCostCents: 800,
      receivedAt: NOW,
    })
    expect(await storage.repositories.lots.list()).toEqual([result.value])

    const movements = await storage.repositories.stockMovements.list()
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({
      type: 'receipt',
      productId: PRODUCT.id,
      lotId: result.value.id,
      quantity: 5,
      userId: OWNER,
      occurredAt: NOW,
    })
    expect(storage.transactionCalls).toBe(1)
  })

  it('no guarda nada si la fecha de vencimiento es inválida', async () => {
    const { storage, service } = await createContext()

    const result = await service.receiveLot({
      productId: PRODUCT.id,
      quantity: 5,
      expiryDate: '2026-02-30',
      unitCostCents: 800,
      userId: OWNER,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('INVALID_LOT')
    expect(await storage.repositories.lots.list()).toEqual([])
    expect(await storage.repositories.stockMovements.list()).toEqual([])
  })

  it('rechaza cantidades que no son enteros positivos', async () => {
    const { storage, service } = await createContext()

    const result = await service.receiveLot({
      productId: PRODUCT.id,
      quantity: 0,
      expiryDate: '2026-12-10',
      unitCostCents: 800,
      userId: OWNER,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('INVALID_LOT_QUANTITY')
    expect(storage.lots.putCalls).toBe(0)
  })
})

describe('getStock', () => {
  it('suma el stock disponible y excluye los lotes vencidos (RF-INV-02)', async () => {
    const { service } = await createContext()
    const expiredLot = await receive(service, { quantity: 2, expiryDate: '2026-12-05' })
    const freshLot = await receive(service, { quantity: 5, expiryDate: '2026-12-10' })

    expect(expiredLot.id).not.toBe(freshLot.id)
    expect(await service.getStock(PRODUCT.id, '2026-12-06')).toBe(5)
  })

  it('todavía cuenta el lote el mismo día de su vencimiento (R-02)', async () => {
    const { service } = await createContext()
    await receive(service, { quantity: 2, expiryDate: '2026-12-05' })
    await receive(service, { quantity: 5, expiryDate: '2026-12-10' })

    expect(await service.getStock(PRODUCT.id, '2026-12-05')).toBe(7)
  })
})

describe('allocateForSale', () => {
  it('asigna primero el lote con vencimiento más próximo (R-01)', async () => {
    const { storage, service } = await createContext()
    const lotA = await receive(service, {
      quantity: 5,
      expiryDate: '2026-12-10',
      unitCostCents: 900,
    })
    const lotB = await receive(service, {
      quantity: 2,
      expiryDate: '2026-12-05',
      unitCostCents: 800,
    })

    const result = await service.allocateForSale(PRODUCT.id, 3, TODAY)

    expect(result).toEqual({
      ok: true,
      value: [
        { lotId: lotB.id, quantity: 2, unitCostCents: 800 },
        { lotId: lotA.id, quantity: 1, unitCostCents: 900 },
      ],
    })
    expect(storage.stockMovements.addCalls).toBe(2)
  })

  it('rechaza toda la venta si no alcanza el stock no vencido (R-04)', async () => {
    const { storage, service } = await createContext()
    await receive(service, { quantity: 5, expiryDate: '2026-12-10' })
    await receive(service, { quantity: 2, expiryDate: '2026-12-05' })

    const result = await service.allocateForSale(PRODUCT.id, 8, TODAY)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('INSUFFICIENT_STOCK')
    expect(result.error.why).toBe('Quedan 7 unidades y quieres vender 8.')
    expect(storage.stockMovements.addCalls).toBe(2)
  })

  it('no ofrece lotes vencidos para la venta (R-02)', async () => {
    const { service } = await createContext()
    await receive(service, { quantity: 2, expiryDate: '2026-12-05' })

    const result = await service.allocateForSale(PRODUCT.id, 1, '2026-12-06')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('INSUFFICIENT_STOCK')
    expect(result.error.why).toContain('Quedan 0 unidades')
  })
})

describe('listExpiringLots', () => {
  it('devuelve lotes dentro del umbral de su categoría con días restantes (R-03)', async () => {
    const { storage, service } = await createContext()
    const expiringLot = await receive(service, { quantity: 5, expiryDate: '2026-12-10' })
    const farLot = await receive(service, { quantity: 5, expiryDate: '2027-02-01' })
    const expiredLot = await receive(service, { quantity: 2, expiryDate: '2026-11-15' })

    const zeroStockLot: Lot = {
      id: 'lot-zero',
      productId: PRODUCT.id,
      expiryDate: '2026-12-01',
      unitCostCents: 800,
      receivedAt: '2026-11-01T10:00:00.000Z',
    }
    await storage.repositories.lots.put(zeroStockLot)

    const expiring = await service.listExpiringLots(TODAY)

    expect(expiring.map((item) => item.lot.id)).not.toContain(farLot.id)
    expect(expiring.map((item) => item.lot.id)).not.toContain(zeroStockLot.id)
    expect(expiring).toEqual([
      {
        lot: expiredLot,
        daysLeft: -5,
        productName: PRODUCT.name,
      },
      {
        lot: expiringLot,
        daysLeft: 20,
        productName: PRODUCT.name,
      },
    ])
  })

  it('usa el umbral configurado en cada categoría (R-03)', async () => {
    const { storage, service } = await createContext()
    await storage.repositories.categories.put({ ...CATEGORY, expiryAlertDays: 10 })
    await receive(service, { quantity: 5, expiryDate: '2026-12-10' })

    expect(await service.listExpiringLots(TODAY)).toEqual([])
  })

  it('omite lotes cuyo producto ya no existe', async () => {
    const { storage, service } = await createContext()
    await receive(service, { quantity: 5, expiryDate: '2026-12-10' })
    await storage.repositories.products.put({ ...PRODUCT, id: 'otro-producto' })
    await storage.products.items.splice(0, 1)

    expect(await service.listExpiringLots(TODAY)).toEqual([])
  })
})

describe('registerWaste', () => {
  it('registra la merma con motivo y pérdida calculada (R-06)', async () => {
    const { service } = await createContext()
    const lot = await receive(service, { quantity: 5, expiryDate: '2026-12-10' })

    const result = await service.registerWaste({
      lotId: lot.id,
      quantity: 2,
      reason: 'expired',
      userId: OWNER,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toMatchObject({
      type: 'waste',
      productId: PRODUCT.id,
      lotId: lot.id,
      quantity: 2,
      reason: 'expired',
      lossCents: 1600,
      userId: OWNER,
      occurredAt: NOW,
    })
    expect(await service.getStock(PRODUCT.id, TODAY)).toBe(3)
  })

  it('rechaza una merma mayor al stock del lote', async () => {
    const { storage, service } = await createContext()
    const lot = await receive(service, { quantity: 5, expiryDate: '2026-12-10' })

    const result = await service.registerWaste({
      lotId: lot.id,
      quantity: 6,
      reason: 'broken',
      userId: OWNER,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('INSUFFICIENT_STOCK')
    expect(storage.stockMovements.addCalls).toBe(1)
  })

  it('rechaza un lote que no existe', async () => {
    const { service } = await createContext()

    const result = await service.registerWaste({
      lotId: 'lot-inexistente',
      quantity: 1,
      reason: 'other',
      userId: OWNER,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('LOT_NOT_FOUND')
  })
})

describe('adjustStock', () => {
  it('registra el ajuste con su delta y motivo (RF-INV-05)', async () => {
    const { service } = await createContext()
    const lot = await receive(service, { quantity: 5, expiryDate: '2026-12-10' })

    const result = await service.adjustStock({
      lotId: lot.id,
      delta: -2,
      reason: 'Conteo físico del turno',
      userId: OWNER,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toMatchObject({
      type: 'adjustment',
      productId: PRODUCT.id,
      lotId: lot.id,
      delta: -2,
      reason: 'Conteo físico del turno',
      userId: OWNER,
      occurredAt: NOW,
    })
    expect(await service.getStock(PRODUCT.id, TODAY)).toBe(3)
  })

  it('rechaza un ajuste que dejaría el lote con stock negativo', async () => {
    const { storage, service } = await createContext()
    const lot = await receive(service, { quantity: 5, expiryDate: '2026-12-10' })

    const result = await service.adjustStock({
      lotId: lot.id,
      delta: -6,
      reason: 'Conteo físico del turno',
      userId: OWNER,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('INSUFFICIENT_STOCK')
    expect(storage.stockMovements.addCalls).toBe(1)
  })

  it('rechaza un ajuste sin cambio o sin motivo', async () => {
    const { service } = await createContext()
    const lot = await receive(service, { quantity: 5, expiryDate: '2026-12-10' })

    const zeroDelta = await service.adjustStock({
      lotId: lot.id,
      delta: 0,
      reason: 'Conteo físico',
      userId: OWNER,
    })
    const blankReason = await service.adjustStock({
      lotId: lot.id,
      delta: 1,
      reason: '  ',
      userId: OWNER,
    })

    expect(zeroDelta.ok).toBe(false)
    expect(blankReason.ok).toBe(false)
  })
})

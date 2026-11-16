import type { AppError, Id, IsoDate, IsoDateTime, Result } from '../../../contracts/common'
import type { Lot, StockMovement } from '../../../contracts/entities'
import type { ExpiringLot, InventoryService, LotAllocation } from '../../../contracts/services'
import type { Storage } from '../../../contracts/storage'
import { createLot } from './lot'
import { allocateLotsForSale, getAvailableStock, getLotStock } from './stock-logic'
import {
  createAdjustmentMovement,
  createReceiptMovement,
  createWasteMovement,
  positiveQuantitySchema,
} from './stock-movement'

const DEFAULT_EXPIRY_ALERT_DAYS = 30
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Datos variables que la app real no puede recibir por el contrato: el reloj y
 * el generador de identificadores. Las pruebas los fijan para ser deterministas.
 */
export type InventoryServiceOptions = {
  now?: () => IsoDateTime
  newId?: () => Id
}

/**
 * Inventario real sobre las interfaces de almacenamiento (RF-INV-02 a RF-INV-06).
 * Calcula con las reglas puras del dominio y guarda lotes con `Repository` y
 * movimientos con `AppendOnlyRepository`.
 */
export class InventoryServiceImpl implements InventoryService {
  private readonly now: () => IsoDateTime
  private readonly newId: () => Id

  constructor(
    private readonly storage: Storage,
    options: InventoryServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString())
    this.newId = options.newId ?? (() => globalThis.crypto.randomUUID())
  }

  /** Stock disponible del producto, sin contar lotes vencidos (RF-INV-02, R-02). */
  async getStock(productId: Id, today: IsoDate): Promise<number> {
    const [lots, movements] = await this.loadInventory()

    return getAvailableStock(lots, movements, productId, today)
  }

  /** Asigna lotes por PEPS sin guardar movimientos; la venta los crea después (RF-INV-06). */
  async allocateForSale(
    productId: Id,
    quantity: number,
    today: IsoDate,
  ): Promise<Result<LotAllocation[]>> {
    const [lots, movements] = await this.loadInventory()

    return allocateLotsForSale(lots, movements, productId, quantity, today)
  }

  /** Lotes con stock que vencen dentro del umbral de su categoría (RF-INV-04, R-03). */
  async listExpiringLots(today: IsoDate): Promise<ExpiringLot[]> {
    const [lots, movements, products, categories] = await Promise.all([
      this.storage.repositories.lots.list(),
      this.storage.repositories.stockMovements.list(),
      this.storage.repositories.products.list(),
      this.storage.repositories.categories.list(),
    ])

    const productsById = new Map(products.map((product) => [product.id, product]))
    const categoriesById = new Map(categories.map((category) => [category.id, category]))
    const expiringLots: ExpiringLot[] = []

    for (const lot of lots) {
      const product = productsById.get(lot.productId)
      if (!product) continue

      const category = categoriesById.get(product.categoryId)
      const alertDays = category?.expiryAlertDays ?? DEFAULT_EXPIRY_ALERT_DAYS
      const daysLeft = daysBetween(today, lot.expiryDate)

      if (daysLeft > alertDays) continue
      if (getLotStock(movements, lot.id) <= 0) continue

      expiringLots.push({ lot, daysLeft, productName: product.name })
    }

    return expiringLots.sort(
      (left, right) =>
        left.daysLeft - right.daysLeft ||
        left.productName.localeCompare(right.productName) ||
        left.lot.id.localeCompare(right.lot.id),
    )
  }

  /** Crea el lote y su movimiento de ingreso en una sola transacción (RF-INV-03). */
  async receiveLot(input: {
    productId: Id
    quantity: number
    expiryDate: IsoDate
    unitCostCents: number
    userId: Id
  }): Promise<Result<Lot>> {
    const parsedQuantity = positiveQuantitySchema.safeParse(input.quantity)
    if (!parsedQuantity.success) {
      return { ok: false, error: invalidLotQuantityError(parsedQuantity.error.issues[0]?.message) }
    }

    const receivedAt = this.now()
    const lotResult = createLot({
      id: this.newId(),
      productId: input.productId,
      expiryDate: input.expiryDate,
      unitCostCents: input.unitCostCents,
      receivedAt,
    })
    if (!lotResult.ok) return lotResult

    const lot = lotResult.value
    const movementResult = createReceiptMovement({
      id: this.newId(),
      lot,
      quantity: parsedQuantity.data,
      userId: input.userId,
      occurredAt: receivedAt,
    })
    if (!movementResult.ok) return movementResult

    const movement = movementResult.value
    await this.storage.transaction(async (repositories) => {
      await repositories.lots.put(lot)
      await repositories.stockMovements.add(movement)
    })

    return { ok: true, value: lot }
  }

  /** Merma de un lote; calcula la pérdida con su costo y exige motivo (RF-INV-05, R-06). */
  async registerWaste(input: {
    lotId: Id
    quantity: number
    reason: 'expired' | 'broken' | 'other'
    userId: Id
  }): Promise<Result<StockMovement>> {
    const parsedQuantity = positiveQuantitySchema.safeParse(input.quantity)
    if (!parsedQuantity.success) {
      return {
        ok: false,
        error: invalidWasteQuantityError(parsedQuantity.error.issues[0]?.message),
      }
    }

    const lot = await this.storage.repositories.lots.get(input.lotId)
    if (!lot) return { ok: false, error: lotNotFoundError(input.lotId) }

    const available = Math.max(
      0,
      getLotStock(await this.storage.repositories.stockMovements.list(), lot.id),
    )
    if (parsedQuantity.data > available) {
      return { ok: false, error: insufficientWasteError(available, parsedQuantity.data) }
    }

    const movementResult = createWasteMovement({
      id: this.newId(),
      lot,
      quantity: parsedQuantity.data,
      reason: input.reason,
      userId: input.userId,
      occurredAt: this.now(),
    })
    if (!movementResult.ok) return movementResult

    await this.storage.repositories.stockMovements.add(movementResult.value)

    return { ok: true, value: movementResult.value }
  }

  /** Ajuste de inventario con delta y motivo; nunca deja stock negativo (RF-INV-05). */
  async adjustStock(input: {
    lotId: Id
    delta: number
    reason: string
    userId: Id
  }): Promise<Result<StockMovement>> {
    const lot = await this.storage.repositories.lots.get(input.lotId)
    if (!lot) return { ok: false, error: lotNotFoundError(input.lotId) }

    const movementResult = createAdjustmentMovement({
      id: this.newId(),
      lot,
      delta: input.delta,
      reason: input.reason,
      userId: input.userId,
      occurredAt: this.now(),
    })
    if (!movementResult.ok) return movementResult

    const currentStock = Math.max(
      0,
      getLotStock(await this.storage.repositories.stockMovements.list(), lot.id),
    )
    const delta = movementResult.value.delta
    if (currentStock + delta < 0) {
      return { ok: false, error: insufficientAdjustmentError(currentStock, delta) }
    }

    await this.storage.repositories.stockMovements.add(movementResult.value)

    return { ok: true, value: movementResult.value }
  }

  private async loadInventory(): Promise<[Lot[], StockMovement[]]> {
    return Promise.all([
      this.storage.repositories.lots.list(),
      this.storage.repositories.stockMovements.list(),
    ])
  }
}

function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((dateToUtc(to) - dateToUtc(from)) / MILLISECONDS_PER_DAY)
}

function dateToUtc(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number)

  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

function invalidLotQuantityError(detail: string | undefined): AppError {
  return {
    code: 'INVALID_LOT_QUANTITY',
    what: 'No se pudo registrar el lote.',
    why: detail ?? 'La cantidad del lote no es válida.',
    how: 'Escribe una cantidad entera mayor que cero.',
  }
}

function invalidWasteQuantityError(detail: string | undefined): AppError {
  return {
    code: 'INVALID_WASTE_QUANTITY',
    what: 'No se pudo registrar la merma.',
    why: detail ?? 'La cantidad de la merma no es válida.',
    how: 'Escribe una cantidad entera mayor que cero.',
  }
}

function lotNotFoundError(lotId: Id): AppError {
  return {
    code: 'LOT_NOT_FOUND',
    what: 'No se encontró el lote.',
    why: `El lote ${lotId} no existe en este dispositivo.`,
    how: 'Actualiza el inventario y vuelve a intentarlo.',
  }
}

function insufficientWasteError(available: number, requested: number): AppError {
  return {
    code: 'INSUFFICIENT_STOCK',
    what: 'No se pudo registrar la merma.',
    why: `Solo quedan ${available} unidades en el lote y quieres dar de baja ${requested}.`,
    how: 'Revisa el stock del lote o pide un ajuste al dueño.',
  }
}

function insufficientAdjustmentError(currentStock: number, delta: number): AppError {
  return {
    code: 'INSUFFICIENT_STOCK',
    what: 'No se pudo ajustar el stock.',
    why: `El lote tiene ${currentStock} unidades y el ajuste de ${delta} dejaría el stock en ${currentStock + delta}.`,
    how: 'Revisa el conteo físico y vuelve a intentarlo.',
  }
}

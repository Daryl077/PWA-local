// Servicios que los módulos usan entre sí (docs/CONTRATOS.md).
import type { Cents, Id, IsoDate, Result } from './common'
import type {
  CashExpense,
  CashSession,
  Category,
  Lot,
  Product,
  Role,
  Sale,
  StockMovement,
  UserInfo,
  WasteReason,
} from './entities'

/** Acciones que el sistema puede permitir u ocultar según el rol. */
export type Action =
  | 'sell'
  | 'view_stock'
  | 'open_own_cash'
  | 'view_costs'
  | 'edit_prices'
  | 'adjust_stock'
  | 'manage_sellers'
  | 'view_reports'
  | 'make_backup'
  | 'receive_lot'
  | 'register_waste'
  | 'manage_categories'
  | 'manage_products'

export interface AuthService {
  currentUser(): UserInfo | null
  login(name: string, password: string): Promise<Result<UserInfo>>
  logout(): void
  lock(): void
  can(action: Action): boolean
  createSeller(name: string, password: string): Promise<Result<UserInfo>>
  setSellerActive(id: Id, active: boolean): Promise<Result<UserInfo>>
  listSellers(): Promise<UserInfo[]>
}

export type LotAllocation = { lotId: Id; quantity: number; unitCostCents: Cents }

/**
 * Alerta de vencimiento. El costo unitario es `null` cuando quien consulta es
 * Vendedor, para no exponer márgenes (RF-SEG-02).
 */
export type ExpiringLot = {
  lotId: Id
  productId: Id
  productName: string
  expiryDate: IsoDate
  daysLeft: number
  unitCostCents: Cents | null
}

export interface InventoryService {
  getStock(productId: Id, today: IsoDate): Promise<number>
  allocateForSale(productId: Id, quantity: number, today: IsoDate): Promise<Result<LotAllocation[]>>
  listExpiringLots(today: IsoDate, viewerRole: Role): Promise<ExpiringLot[]>

  listCategories(): Promise<Category[]>
  createCategory(input: { name: string; expiryAlertDays: number }): Promise<Result<Category>>
  updateCategory(input: {
    id: Id
    name?: string
    expiryAlertDays?: number
  }): Promise<Result<Category>>
  /** Solo si la categoría no tiene productos asociados. */
  deleteCategory(id: Id): Promise<Result<void>>

  listProducts(): Promise<Product[]>
  createProduct(input: {
    name: string
    categoryId: Id
    priceCents: Cents
    costCents: Cents
    minStock: number
    isFavorite: boolean
    active: boolean
  }): Promise<Result<Product>>
  updateProduct(input: {
    id: Id
    name?: string
    categoryId?: Id
    priceCents?: Cents
    costCents?: Cents
    minStock?: number
    isFavorite?: boolean
    active?: boolean
  }): Promise<Result<Product>>
  /** Si el producto ya tiene movimientos, se desactiva en vez de borrarse. */
  deleteProduct(id: Id): Promise<Result<void>>

  /** `lossCents` se calcula como quantity * unitCostCents del lote. */
  registerWaste(input: {
    lotId: Id
    quantity: number
    reason: WasteReason
    userId: Id
  }): Promise<Result<StockMovement>>
  receiveLot(input: {
    productId: Id
    quantity: number
    expiryDate: IsoDate
    unitCostCents: Cents
    userId: Id
    /** Confirma explícitamente el ingreso de un lote ya vencido (RF-INV-02). */
    acceptExpired?: boolean
  }): Promise<Result<Lot>>
  adjustStock(input: {
    lotId: Id
    delta: number
    reason: string
    userId: Id
  }): Promise<Result<StockMovement>>
}

export interface CashService {
  getOpenSession(sellerId: Id): Promise<CashSession | null>
  openSession(sellerId: Id, openingFloatCents: Cents): Promise<Result<CashSession>>
  addExpense(input: {
    cashSessionId: Id
    amountCents: Cents
    description: string
  }): Promise<Result<CashExpense>>
  closeSession(input: {
    cashSessionId: Id
    countedCents: Cents
    explanation?: string
  }): Promise<Result<CashSession>>
}

export type NewPayment =
  { type: 'cash'; receivedCents: Cents } | { type: 'qr'; receiptConfirmed: true }

export type NewSale = {
  /** Clave de idempotencia. Si la venta ya existe, registerSale no la duplica. */
  id: Id
  sellerId: Id
  lines: Array<{ productId: Id; quantity: number }>
  payment: NewPayment
}

export interface SalesService {
  /**
   * Asigna lotes con InventoryService.allocateForSale, crea los StockMovement de
   * tipo 'sale' y guarda la venta en una sola transacción.
   */
  registerSale(sale: NewSale, today: IsoDate): Promise<Result<Sale>>
}

export interface BackupService {
  exportBackup(): Promise<Blob>
  importBackup(file: File): Promise<Result<{ restoredTables: number }>>
}

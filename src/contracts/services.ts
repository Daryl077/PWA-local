// Servicios que los módulos usan entre sí (docs/CONTRATOS.md).
import type { Cents, Id, IsoDate, Result } from './common'
import type {
  CashExpense,
  CashSession,
  Lot,
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

export type ExpiringLot = { lot: Lot; daysLeft: number; productName: string }

export interface InventoryService {
  getStock(productId: Id, today: IsoDate): Promise<number>
  allocateForSale(productId: Id, quantity: number, today: IsoDate): Promise<Result<LotAllocation[]>>
  listExpiringLots(today: IsoDate): Promise<ExpiringLot[]>
  registerWaste(input: {
    lotId: Id
    quantity: number
    reason: WasteReason
  }): Promise<Result<StockMovement>>
  receiveLot(input: {
    productId: Id
    quantity: number
    expiryDate: IsoDate
    unitCostCents: Cents
  }): Promise<Result<Lot>>
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

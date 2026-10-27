// Interfaces de almacenamiento (docs/CONTRATOS.md).
import type { Id } from './common'
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
} from './entities'

// Los tipos base viven en common.ts y se reexportan aquí para no romper imports existentes.
export type { Cents, Id, IsoDate, IsoDateTime } from './common'

export interface Repository<T extends { id: Id }> {
  get(id: Id): Promise<T | undefined>
  list(): Promise<T[]>
  put(item: T): Promise<void>
}

/** Movimientos y ventas: solo se agregan, nunca se editan ni se borran. */
export interface AppendOnlyRepository<T extends { id: Id }> {
  add(item: T): Promise<void>
  list(): Promise<T[]>
}

export type Repositories = {
  users: Repository<UserRecord>
  categories: Repository<Category>
  products: Repository<Product>
  lots: Repository<Lot>
  stockMovements: AppendOnlyRepository<StockMovement>
  sales: AppendOnlyRepository<Sale>
  cashSessions: Repository<CashSession>
  cashExpenses: AppendOnlyRepository<CashExpense>
  settings: Repository<Setting>
}

export interface Storage {
  repositories: Repositories
  /** Todo o nada. Aquí se guarda una venta con sus movimientos. */
  transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T>
}

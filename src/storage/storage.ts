import type {
  Id,
  Repository,
  AppendOnlyRepository,
  Repositories,
  Storage,
} from '../contracts/storage'
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
} from '../contracts/entities'
import Dexie, { type Table } from 'dexie'

class AppDatabase extends Dexie {
  users!: Table<UserRecord, unknown>
  categories!: Table<Category, unknown>
  products!: Table<Product, unknown>
  lots!: Table<Lot, unknown>
  stockMovements!: Table<StockMovement, unknown>
  sales!: Table<Sale, unknown>
  cashSessions!: Table<CashSession, unknown>
  cashExpenses!: Table<CashExpense, unknown>
  settings!: Table<Setting, unknown>

  constructor() {
    super('licoreria-db')
    this.version(1).stores({
      users: 'id',
      categories: 'id',
      products: 'id',
      lots: 'id',
      stockMovements: 'id',
      sales: 'id',
      cashSessions: 'id',
      cashExpenses: 'id',
      settings: 'id',
    })
  }
}

class DexieRepository<T extends { id: Id }> implements Repository<T> {
  constructor(private db: Table<T, unknown>) {}

  async get(id: Id): Promise<T | undefined> {
    return await this.db.get(id)
  }

  async list(): Promise<T[]> {
    return await this.db.toArray()
  }

  async put(item: T): Promise<void> {
    await this.db.put(item)
  }
}

class DexieAppendOnlyRepository<T extends { id: Id }> implements AppendOnlyRepository<T> {
  constructor(private db: Table<T, unknown>) {}

  async add(item: T): Promise<void> {
    await this.db.add(item)
  }

  async list(): Promise<T[]> {
    return await this.db.toArray()
  }
}

export class StorageImpl implements Storage {
  public db = new AppDatabase()

  public repositories: Repositories = {
    users: new DexieRepository(this.db.users),
    categories: new DexieRepository(this.db.categories),
    products: new DexieRepository(this.db.products),
    lots: new DexieRepository(this.db.lots),
    stockMovements: new DexieAppendOnlyRepository(this.db.stockMovements),
    sales: new DexieAppendOnlyRepository(this.db.sales),
    cashSessions: new DexieRepository(this.db.cashSessions),
    cashExpenses: new DexieAppendOnlyRepository(this.db.cashExpenses),
    settings: new DexieRepository(this.db.settings),
  }

  async transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    // Todas las tablas comparten la clave primaria 'id'.
    const tables = [
      this.db.users,
      this.db.categories,
      this.db.products,
      this.db.lots,
      this.db.stockMovements,
      this.db.sales,
      this.db.cashSessions,
      this.db.cashExpenses,
      this.db.settings,
    ] as unknown as Table<{ id: Id }, unknown>[]

    return await this.db.transaction('rw', tables, async () => {
      return await work(this.repositories)
    })
  }
}

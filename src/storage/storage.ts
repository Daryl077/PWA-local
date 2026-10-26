import type { Id, Repository, AppendOnlyRepository, Repositories, Storage } from '../contracts/storage'
import Dexie, { type Table } from 'dexie'

// Tipo base para entidades que tienen un ID.
// Se refinarán en T-015a cuando se definan las entidades reales.
type EntityBase = { id: Id }

class AppDatabase extends Dexie {
  users!: Table<EntityBase, unknown>
  categories!: Table<EntityBase, unknown>
  products!: Table<EntityBase, unknown>
  lots!: Table<EntityBase, unknown>
  stockMovements!: Table<EntityBase, unknown>
  sales!: Table<EntityBase, unknown>
  cashSessions!: Table<EntityBase, unknown>
  cashExpenses!: Table<EntityBase, unknown>
  settings!: Table<EntityBase, unknown>

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
    users: new DexieRepository(this.db.users) as unknown as Repository<EntityBase>,
    categories: new DexieRepository(this.db.categories) as unknown as Repository<EntityBase>,
    products: new DexieRepository(this.db.products) as unknown as Repository<EntityBase>,
    lots: new DexieRepository(this.db.lots) as unknown as Repository<EntityBase>,
    stockMovements: new DexieAppendOnlyRepository(this.db.stockMovements) as unknown as AppendOnlyRepository<EntityBase>,
    sales: new DexieAppendOnlyRepository(this.db.sales) as unknown as AppendOnlyRepository<EntityBase>,
    cashSessions: new DexieRepository(this.db.cashSessions) as unknown as Repository<EntityBase>,
    cashExpenses: new DexieAppendOnlyRepository(this.db.cashExpenses) as unknown as AppendOnlyRepository<EntityBase>,
    settings: new DexieRepository(this.db.settings) as unknown as Repository<EntityBase>,
  }

  async transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
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
    ] as Table<EntityBase, unknown>[]

    return await this.db.transaction('rw', tables, async () => {
      return await work(this.repositories)
    })
  }
}

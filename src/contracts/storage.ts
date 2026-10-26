export type Id = string
export type Cents = number
export type IsoDate = string
export type IsoDateTime = string

export interface Repository<T extends { id: Id }> {
  get(id: Id): Promise<T | undefined>
  list(): Promise<T[]>
  put(item: T): Promise<void>
}

export interface AppendOnlyRepository<T extends { id: Id }> {
  add(item: T): Promise<void>
  list(): Promise<T[]>
}

type EntityBase = { id: Id }

export type Repositories = {
  users: Repository<EntityBase>
  categories: Repository<EntityBase>
  products: Repository<EntityBase>
  lots: Repository<EntityBase>
  stockMovements: AppendOnlyRepository<EntityBase>
  sales: AppendOnlyRepository<EntityBase>
  cashSessions: Repository<EntityBase>
  cashExpenses: AppendOnlyRepository<EntityBase>
  settings: Repository<EntityBase>
}

export interface Storage {
  repositories: Repositories
  transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T>
}

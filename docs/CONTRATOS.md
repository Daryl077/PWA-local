# CONTRATOS.md - Acuerdo entre módulos

Este archivo es el acuerdo entre las dos personas[cite: 3]. Cada módulo se desarrolla contra estos contratos, y el código vive en `src/contracts/`[cite: 3]. Lo que está aquí se escribe en TypeScript tal cual, y cualquier cambio necesita el acuerdo de ambas personas[cite: 3].

## Reglas
- Un módulo usa a otro solo por su servicio de este archivo, nunca por sus archivos internos[cite: 3].
- Cada servicio tiene un `fake.ts` en memoria[cite: 3]. Los módulos que dependen de él se prueban con el fake mientras la versión real no existe[cite: 3].
- Un cambio de contrato va en un PR aparte, que solo toca `docs/CONTRATOS.md`, `src/contracts/` y los fakes afectados[cite: 3].
- Las funciones reciben la fecha de hoy (`today`) como parámetro[cite: 3]. No llaman a `Date.now()`[cite: 3].
- Los servicios devuelven `Result` en vez de lanzar errores por casos del negocio (stock insuficiente, caja ya abierta)[cite: 3].

## Tipos base
```ts
type Id = string;          // UUID creado con crypto.randomUUID()
type Cents = number;       // entero, centavos de boliviano
type IsoDate = string;     // 'YYYY-MM-DD' (vencimientos)
type IsoDateTime = string; // ISO 8601 en UTC

type AppError = { code: string; what: string; why: string; how: string };
type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
```

## Entidades
```ts
type Role = 'owner' | 'seller';
type UserInfo = { id: Id; name: string; role: Role; active: boolean };

type Category = { id: Id; name: string; expiryAlertDays: number };
type Product = {
  id: Id; name: string; categoryId: Id;
  priceCents: Cents; costCents: Cents;
  minStock: number; isFavorite: boolean; active: boolean;
};
type Lot = { id: Id; productId: Id; expiryDate: IsoDate; unitCostCents: Cents; receivedAt: IsoDateTime };

type WasteReason = 'expired' | 'broken' | 'other';
type MovementBase = { id: Id; productId: Id; lotId: Id; occurredAt: IsoDateTime; userId: Id };
type StockMovement =
  | (MovementBase & { type: 'receipt'; quantity: number })
  | (MovementBase & { type: 'sale'; quantity: number; saleId: Id })
  | (MovementBase & { type: 'waste'; quantity: number; reason: WasteReason; lossCents: Cents })
  | (MovementBase & { type: 'adjustment'; delta: number; reason: string });

type Payment =
  | { type: 'cash'; receivedCents: Cents; changeCents: Cents }
  | { type: 'qr'; receiptConfirmed: true };
type SaleLine = { productId: Id; lotId: Id; quantity: number; unitPriceCents: Cents; unitCostCents: Cents };
type Sale = {
  id: Id; cashSessionId: Id; sellerId: Id;
  lines: SaleLine[]; totalCents: Cents; payment: Payment; createdAt: IsoDateTime;
};

// Si differenceCents !== 0, explanation es obligatoria
type CashClosing = { countedCents: Cents; expectedCents: Cents; differenceCents: Cents; explanation: string };
type CashSession = {
  id: Id; sellerId: Id; openedAt: IsoDateTime; openingFloatCents: Cents;
  closedAt?: IsoDateTime; closing?: CashClosing;
};
type CashExpense = { id: Id; cashSessionId: Id; amountCents: Cents; description: string; createdAt: IsoDateTime };
```

## Servicios
```ts
// Fase 1. Módulo auth
type Action =
  | 'sell' | 'view_stock' | 'open_own_cash'
  | 'view_costs' | 'edit_prices' | 'adjust_stock' | 'manage_sellers'
  | 'view_reports' | 'make_backup' | 'receive_lot' | 'manage_categories' | 'manage_products';

interface AuthService {
  currentUser(): UserInfo | null;
  login(name: string, password: string): Promise<Result<UserInfo>>;
  logout(): void;
  lock(): void;
  can(action: Action): boolean;
  createSeller(name: string, password: string): Promise<Result<UserInfo>>;
  setSellerActive(id: Id, active: boolean): Promise<Result<UserInfo>>;
  listSellers(): Promise<UserInfo[]>;
}

type LotAllocation = { lotId: Id; quantity: number; unitCostCents: Cents };

interface InventoryService {
  getStock(productId: Id, today: IsoDate): Promise<number>;
  allocateForSale(productId: Id, quantity: number, today: IsoDate): Promise<Result<LotAllocation[]>>;
  listExpiringLots(today: IsoDate): Promise<Array<{ Lot; daysLeft: lot: number productName: string; }>>;
  registerWaste(input: { lotId: Id; quantity: number; reason: WasteReason }): Promise<Result<StockMovement>>;
  receiveLot(input: { productId: Id; quantity: number; expiryDate: IsoDate; unitCostCents: Cents }): Promise<Result<Lot>>;
}

interface CashService {
  getOpenSession(sellerId: Id): Promise<CashSession null |>;
  openSession(sellerId: Id, openingFloatCents: Cents): Promise<Result<CashSession>>;
  addExpense(input: { cashSessionId: Id; amountCents: Cents; description: string }): Promise<Result<CashExpense>>;
  closeSession(input: { cashSessionId: Id; countedCents: Cents; explanation?: string }): Promise<Result<CashSession>>;
}

type NewPayment = { type: 'cash'; receivedCents: Cents } | { type: 'qr'; receiptConfirmed: true };
type NewSale = {
  id: Id; // Clave de idempotencia. Si ya existe, registerSale no la duplica y devuelve la existente.
  sellerId: Id;
  lines: Array<{ productId: Id; quantity: number }>;
  payment: NewPayment;
};

interface SalesService {
  // SalesService asigna lotes con InventoryService.allocateForSale, crea los StockMovement ('sale') y guarda la venta en una sola transacción.
  registerSale(sale: NewSale, today: IsoDate): Promise<Result<Sale>>;
}

interface BackupService {
  exportBackup(): Promise<Blob>;
  importBackup(file: File): Promise<Result<{ number restoredTables: }>>;
}
```

## Almacenamiento
```ts
interface Repository<T extends { id: Id }> {
  get(id: Id): Promise<T | undefined>;
  list(): Promise<T[]>;
  put(item: T): Promise<void>;
}
interface AppendOnlyRepository<T extends { id: Id }> {   // no se edita ni se borra
  add(item: T): Promise<void>;
  list(): Promise<T[]>;
}

type Repositories = {
  users: Repository<UserInfo & { passwordHash: string }>;
  categories: Repository<Category>;
  products: Repository<Product>;
  lots: Repository<Lot>;
  stockMovements: AppendOnlyRepository<StockMovement>;
  sales: AppendOnlyRepository<Sale>;
  cashSessions: Repository<CashSession>;
  cashExpenses: AppendOnlyRepository<CashExpense>;
  settings: Repository<{ id: Id; value: unknown }>;
};

interface Storage {
  repositories: Repositories;
  // Todo o nada. Aquí se guarda una venta con sus movimientos
  transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}
```

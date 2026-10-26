# CONTRATOS.md - Acuerdo entre módulos

Este archivo es el acuerdo entre las dos personas. Cada módulo se desarrolla contra estos contratos, y el código vive en `src/contracts/`. Lo que está aquí se escribe en TypeScript tal cual, y cualquier cambio necesita el acuerdo de ambas personas.

## Reglas
- Un módulo usa a otro solo por su servicio de este archivo, nunca por sus archivos internos.
- Cada servicio tiene un `fake.ts` en memoria. Los módulos que dependen de él se prueban con el fake mientras la versión real no existe.
- Un cambio de contrato va en un PR aparte, que solo toca `docs/CONTRATOS.md`, `src/contracts/` y los fakes afectados.
- Las funciones reciben la fecha de hoy (`today`) como parámetro. No llaman a `Date.now()`.
- Los servicios devuelven `Result` en vez de lanzar errores por casos del negocio (stock insuficiente, caja ya abierta).
- Los contratos de compras y reportes se definen al llegar a esas fases.

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
type UserInfo = { id: Id; name: string; role: Role; active: boolean }; // sin contraseña

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
// Unidades de un lote = ingresos - ventas - mermas + ajustes. No se guarda como número editable.

type Payment =
  | { type: 'cash'; receivedCents: Cents; changeCents: Cents }
  | { type: 'qr'; receiptConfirmed: true };
type SaleLine = { productId: Id; lotId: Id; quantity: number; unitPriceCents: Cents; unitCostCents: Cents };
type Sale = {
  id: Id; cashSessionId: Id; sellerId: Id;
  lines: SaleLine[]; totalCents: Cents; payment: Payment; createdAt: IsoDateTime;
};

type CashClosing = { countedCents: Cents; expectedCents: Cents; differenceCents: Cents; explanation?: string };
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
  | 'view_reports' | 'make_backup';

interface AuthService {
  currentUser(): UserInfo | null;
  login(name: string, password: string): Promise<Result<UserInfo>>;
  logout(): void;
  lock(): void;
  can(action: Action): boolean;
  createSeller(name: string, password: string): Promise<Result<UserInfo>>;   // solo Dueño
  setSellerActive(id: Id, active: boolean): Promise<Result<UserInfo>>;       // solo Dueño
  listSellers(): Promise<UserInfo[]>;
}

// Fase 2. Módulo inventory
type LotAllocation = { lotId: Id; quantity: number; unitCostCents: Cents };

interface InventoryService {
  getStock(productId: Id, today: IsoDate): Promise<number>; // no cuenta lotes vencidos
  // PEPS, sin lotes vencidos. Falla con stock insuficiente (REGLAS R-01, R-02, R-04)
  allocateForSale(productId: Id, quantity: number, today: IsoDate): Promise<Result<LotAllocation[]>>;
  listExpiringLots(today: IsoDate): Promise<Array<{ lot: Lot; productName: string; daysLeft: number }>>;
  registerWaste(input: { lotId: Id; quantity: number; reason: WasteReason }): Promise<Result<StockMovement>>;
  receiveLot(input: { productId: Id; quantity: number; expiryDate: IsoDate; unitCostCents: Cents }): Promise<Result<Lot>>;
}

// Fase 4. Módulo cash
interface CashService {
  getOpenSession(sellerId: Id): Promise<CashSession | null>;
  openSession(sellerId: Id, openingFloatCents: Cents): Promise<Result<CashSession>>;
  addExpense(input: { cashSessionId: Id; amountCents: Cents; description: string }): Promise<Result<CashExpense>>;
  closeSession(input: { cashSessionId: Id; countedCents: Cents; explanation?: string }): Promise<Result<CashSession>>;
}

// Fase 3. Módulo sales
type NewPayment = { type: 'cash'; receivedCents: Cents } | { type: 'qr'; receiptConfirmed: true };
type NewSale = {
  id: Id;                       // lo crea el cliente. Repetirlo no duplica la venta
  sellerId: Id;
  lines: Array<{ productId: Id; quantity: number }>;
  payment: NewPayment;
};

interface SalesService {
  // Exige caja abierta. Descuenta stock por PEPS y guarda todo en una sola transacción
  registerSale(sale: NewSale, today: IsoDate): Promise<Result<Sale>>;
}

// Fase 5. Módulo backup
interface BackupService {
  exportBackup(): Promise<Blob>;
  importBackup(file: File): Promise<Result<{ restoredTables: number }>>;
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

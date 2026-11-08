// src/contracts/inventory.ts

/**
 * Category contract – represents a product grouping.
 */
export interface Category {
  id: string; // UUID
  name: string;
  expiryAlertDays: number; // days before expiry to generate an alert
}

/**
 * Product contract – an item that can be sold.
 */
export interface Product {
  id: string; // UUID
  name: string;
  categoryId: string; // links to Category.id
  priceCents: number; // selling price in centavos
  costCents: number; // acquisition cost in centavos
  minStock: number; // minimum desired stock
  isFavorite: boolean; // whether product is marked as favorite
  active: boolean; // available for sale
  description?: string;
}

/**
 * Lot (Lote) contract – a specific lot of stock with expiration.
 */
export interface Lot {
  id: string; // UUID
  productId: string; // links to Product.id
  expiryDate: string; // ISO date YYYY-MM-DD
  unitCostCents: number; // cost per unit for this lot
  receivedAt: string; // ISO‑8601 timestamp when the lot was recorded
}

/**
 * StockMovement contract – immutable audit record of any stock change.
 */
export type StockMovementType = 'receipt' | 'sale' | 'waste' | 'adjustment';

export type WasteReason = 'expired' | 'broken' | 'other';

export interface StockMovementBase {
  id: string; // UUID
  productId: string; // reference to Product
  lotId: string; // reference to Lot
  occurredAt: string; // ISO‑8601 timestamp
  userId: string; // user performing the action
}

export interface ReceiptMovement extends StockMovementBase {
  type: 'receipt';
  quantity: number; // units received
}

export interface SaleMovement extends StockMovementBase {
  type: 'sale';
  quantity: number; // units sold
  saleId: string; // identifier of the sale transaction
}

export interface WasteMovement extends StockMovementBase {
  type: 'waste';
  quantity: number; // units discarded
  reason: WasteReason;
  lossCents: number; // monetary loss associated with waste
}

export interface AdjustmentMovement extends StockMovementBase {
  type: 'adjustment';
  delta: number; // positive or negative adjustment to quantity
  reason: string; // description of why the adjustment was made
}

export type StockMovement =
  | ReceiptMovement
  | SaleMovement
  | WasteMovement
  | AdjustmentMovement;

/**
 * Allocation result for a sale request.
 */
export interface LotAllocation {
  lotId: string; // UUID of the lot assigned
  quantity: number; // units taken from this lot
  unitCostCents: number; // cost per unit of the assigned lot
}

/**
 * Expiring lot information returned by listExpiringLots.
 * unitCostCents is null when the viewer is a seller.
 */
export interface ExpiringLot {
  lotId: string;
  productId: string;
  productName: string;
  expiryDate: string;
  daysLeft: number;
  unitCostCents: number | null;
}

/**
 * Inventory service contract – methods exposed to other modules.
 */
export interface InventoryService {
  /** Returns total stock for a product as of the given date (excluding expired lots). */
  getStock(productId: string, today: string): Promise<number>;

  /** Allocates lots for a sale using PEPS; fails with INSUFFICIENT_STOCK if not enough stock. */
  allocateForSale(productId: string, quantity: number, today: string): Promise<Result<LotAllocation[]>>;

  /** Lists lots that will expire within their category's expiryAlertDays. */
  listExpiringLots(today: string, viewerRole: Role): Promise<ExpiringLot[]>;

  /** Lists categories. */
  listCategories(): Promise<Category[]>;

  /** Creates a category (owner only). */
  createCategory(input: { name: string; expiryAlertDays: number }): Promise<Result<Category>>;

  /** Updates a category (owner only). */
  updateCategory(input: { id: string; name?: string; expiryAlertDays?: number }): Promise<Result<Category>>;

  /** Deletes a category only when it has no products (owner only). */
  deleteCategory(id: string): Promise<Result<void>>;

  /** Lists products. */
  listProducts(): Promise<Product[]>;

  /** Creates a product linked to an existing category (owner only). */
  createProduct(input: {
    name: string;
    categoryId: string;
    priceCents: number;
    costCents: number;
    minStock: number;
    isFavorite: boolean;
    active: boolean;
  }): Promise<Result<Product>>;

  /** Updates a product (owner only). */
  updateProduct(input: {
    id: string;
    name?: string;
    categoryId?: string;
    priceCents?: number;
    costCents?: number;
    minStock?: number;
    isFavorite?: boolean;
    active?: boolean;
  }): Promise<Result<Product>>;

  /** Deletes a product without movements; otherwise deactivate it (owner only). */
  deleteProduct(id: string): Promise<Result<void>>;

  /** Registers a waste movement (owner only). lossCents is quantity * lot.unitCostCents. */
  registerWaste(input: { lotId: string; quantity: number; reason: WasteReason; userId: string }): Promise<Result<StockMovement>>;

  /** Registers receipt of a lot (owner only). acceptExpired confirms a past expiry date. */
  receiveLot(input: { productId: string; quantity: number; expiryDate: string; unitCostCents: number; userId: string; acceptExpired?: boolean }): Promise<Result<Lot>>;

  /** Adjusts stock for a lot (owner only). */
  adjustStock(input: { lotId: string; delta: number; reason: string; userId: string }): Promise<Result<StockMovement>>;
}

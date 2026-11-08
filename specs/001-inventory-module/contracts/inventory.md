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
 */
export interface ExpiringLot {
  lot: Lot;
  daysLeft: number;
  productName: string;
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
  listExpiringLots(today: string): Promise<ExpiringLot[]>;

  /** Registers a waste movement (owner only). */
  registerWaste(input: { lotId: string; quantity: number; reason: WasteReason; userId: string }): Promise<Result<StockMovement>>;

  /** Registers receipt of a lot (owner only). */
  receiveLot(input: { productId: string; quantity: number; expiryDate: string; unitCostCents: number; userId: string }): Promise<Result<Lot>>;

  /** Adjusts stock for a lot (owner only). */
  adjustStock(input: { lotId: string; delta: number; reason: string; userId: string }): Promise<Result<StockMovement>>;
}

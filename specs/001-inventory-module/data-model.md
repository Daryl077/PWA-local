# Data Model: Inventory Module

## Entities

### Category
- **id**: string (UUID) – unique identifier.
- **name**: string – descriptive name of the category.
- **expiryAlertDays**: number – days before expiry when an alert should be generated.

### Product
- **id**: string (UUID).
- **categoryId**: string – reference to the owning **Category** (must exist).
- **name**: string – product name.
- **description**?: string – optional description.
- **priceCents**: number – selling price in centavos.
- **costCents**: number – acquisition cost in centavos.
- **minStock**: number – minimum desired stock.
- **isFavorite**: boolean – whether the product is marked as favorite.
- **active**: boolean – indicates if the product is available for sale.

### Lot (Lote)
- **id**: string (UUID).
- **productId**: string – reference to the associated **Product**.
- **expiryDate**: string (YYYY‑MM‑DD) – mandatory expiration date.
- **unitCostCents**: number – cost per unit for this lot.
- **receivedAt**: string (ISO‑8601) – timestamp when the lot was recorded.

### StockMovement
- **id**: string (UUID).
- **productId**: string – reference to the affected **Product**.
- **lotId**: string – reference to the affected **Lot**.
- **occurredAt**: string (ISO‑8601) – timestamp of the movement.
- **userId**: string – identifier of the user who performed the action.
- **type**: `'receipt'` | `'sale'` | `'waste'` | `'adjustment'`.
- **quantity** *(receipt | sale)*: number – units added (receipt) or removed (sale).
- **saleId** *(sale)*: string – identifier of the sale transaction.
- **reason** *(waste)*: `'expired'` | `'broken'` | `'other'` – cause of waste.
- **lossCents** *(waste)*: number – monetary loss associated with the waste.
- **delta** *(adjustment)*: number – positive or negative adjustment to quantity.
- **reason** *(adjustment)*: string – description of the adjustment reason.

## Relationships & Constraints

- A **Product** belongs to exactly one **Category**; a **Category** may have many **Products**.
- A **Lot** is linked to a single **Product**; a **Product** can have multiple **Lots**.
- **Immutabilidad**: Los `StockMovement` son registros inmutables; cualquier corrección o ajuste crea un nuevo movimiento en lugar de modificar uno existente.

- The system calculates a **Product**'s total stock as the sum of all `quantity` from `receipt` movements minus the sum of `quantity` from `sale` and `waste` movements, plus the `delta` from `adjustment` movements, across all its lots.
- Deleting a **Category** is prohibited if any **Product** references it; re‑assignment is required first.
- Inserting a **Lot** with an `expiryDate` earlier than the current date triggers a warning; it can be saved only after explicit owner confirmation.
- A **Lot** whose `expiryDate` is before today is considered *vencido* and must not be used in `allocateForSale`.

## Validation Rules (Zod)

- `Category.name` must be non‑empty and unique among active categories.
- `Category.expiryAlertDays` must be a positive integer.
- `Product.name` must be non‑empty; `priceCents` and `costCents` must be integers ≥ 0.
- `Product.isFavorite` is a boolean; `active` is a boolean.
- `Lot.expiryDate` must match `YYYY‑MM‑DD` format and be a valid calendar date.
- `Lot.unitCostCents` must be an integer ≥ 0.
- `StockMovement` fields must conform to their specific type requirements (e.g., `reason` only for `waste` or `adjustment`).
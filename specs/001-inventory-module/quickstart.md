# Quickstart & Validation Guide: Inventory Module

## Prerequisites

- Node.js 22+ installed.
- Project dependencies installed (`npm install`).
- Development server running (`npm run dev`).
- Access to the PWA in a browser that supports IndexedDB.

## Setup Steps

1. **Start the application**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

2. **Open the Inventory Management UI**:
   - Navigate to the "Inventario" section from the main menu.

- **receiveLot**: al crear un lote, el servicio crea el registro del lote y además genera un `StockMovement` de tipo `receipt` que incrementa el stock.
- **registerWaste**: crea un `StockMovement` de tipo `waste` con el motivo (`expired`|`broken`|`other`) y la pérdida monetaria.
- **adjustStock**: crea un `StockMovement` de tipo `adjustment` que aplica el `delta` indicado y registra el motivo de ajuste.
- **userId**: siempre proviene del usuario autenticado (propagado desde `AuthService.currentUser().id`).
- **listExpiringLots** devuelve directamente un array de `ExpiringLot` (no envuelve en `Result`).


### 1. Category Management
- **Create a Category**: Use the "Agregar categoría" button, enter a name (e.g., "Licores") and an `expiryAlertDays` value, then save.
- **Verify**: The new category appears in the list.
- **Edit Category**: Change the name or `expiryAlertDays`, save, and confirm the updates persist.
- **Delete Prevention**: Attempt to delete a category that has products; the UI must block the action and display a warning.

### 2. Product Management
- **Create a Product**: With a category selected, add a product specifying:
  - `name`
  - optional `description`
  - `priceCents`
  - `costCents`
  - `minStock`
  - `isFavorite`
  - `active`
- **Verify**: The product appears under its category and can be edited.

### 3. Lot Registration
- **Add a Lot**: Open a product, click "Nuevo lote", provide:
  - `quantity` (units received)
  - `expiryDate` (YYYY‑MM‑DD)
  - `unitCostCents`
  - confirm creation.
- **Verify Total Stock**: The product's total stock display updates to reflect the sum of all receipt movements (including this lot).
- **Edge Case – Past Expiration**: Attempt to add a lot with an `expiryDate` earlier than today. The UI must show a warning and require explicit owner confirmation before saving.

### 4. Stock Movements & PEPS
- **Allocate for Sale**: Simulate a sale of `Q` units for a product. The system should allocate lots using PEPS (earliest expiry first) and return the assigned lot(s). Verify that:
  - Only non‑expired lots are considered.
  - The assigned lot IDs and quantities match the expected PEPS order.
  - If the available stock is insufficient, the allocation fails with `INSUFFICIENT_STOCK` and no stock is deducted.
- **Record a Sale Movement** (optional step for full flow): After a successful allocation, the sales module creates a `sale` `StockMovement`. Verify that total stock decreases accordingly.
- **Record a Waste**: Register a waste movement for a specific lot, providing `quantity`, `reason` (`expired`|`broken`|`other`) and `lossCents`. Verify the stock reduces by the waste quantity.
- **Adjust Stock**: Use the `adjustStock` action to increase or decrease a lot's quantity, providing `delta` and a reason. Verify the adjustment is reflected in total stock.

### 5. Expiration Alerts
- **Configure Alert Window**: In settings, set the alert window (e.g., 30 days).
- **Validate Alerts**: Create a lot whose `expiryDate` is within the configured window and confirm it appears in the "Alertas de vencimiento" view.
- **Expired Items**: Create a lot with a past expiration date and verify it is listed as "Vencido".

## Automated Test Verification (Vitest)

The feature includes unit tests under `src/features/inventory/__tests__` that cover:
- Category CRUD operations.
- Product‑to‑Category association and field validation (price, cost, `expiryAlertDays`).
- Lot creation with validation of `expiryDate` format and required `quantity` and `unitCostCents`.
- Stock movement logic respecting PEPS ordering and proper handling of insufficient stock.
- Expiration alert generation based on configurable windows.

Run the test suite:
```bash
npm run test
```
All tests for the inventory module must pass.

## Acceptance Checklist

- [x] Category creation, edit, and protection against deletion with products.
- [x] Product creation linked to a category with all required fields.
- [x] Lot registration with mandatory `quantity`, `expiryDate`, and `unitCostCents`.
- [x] Correct stock aggregation and PEPS behavior, including failure on insufficient stock.
- [x] Expiration alerts display correctly.
- [x] All related unit tests pass.

## Notes

- The quickstart guide intentionally avoids implementation details (no file paths, no component names). It focuses on user‑visible actions and expected outcomes.
- For deeper debugging, developers can inspect the Dexie database via the browser's IndexedDB viewer.

---

description: "Task list for Inventory Module feature implementation"
---

# Tasks: Inventory Module

**Input**: Design documents from `/specs/001-inventory-module/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/, quickstart.md

## Format: `- [ ] TaskID [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create inventory feature folder `src/features/inventory` and placeholder `index.ts`
- [ ] T002 Create `domain/` and `ui/` subfolders under `src/features/inventory`
- [ ] T003 [P] Add linting/formatting configuration for new files (update `.eslintrc`, `prettier.config.js`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that must be ready before any user story work

- [ ] T004 Update `src/contracts/services.ts` to add `userId` fields to `receiveLot` and `registerWaste`, add `adjustStock` method, change `listExpiringLots` to return plain array. Update `docs/CONTRATOS.md` accordingly, add new action `register_waste` in `src/features/auth/domain/permissions.ts`, and adjust the inventory service fakes. Write contract unit tests for the updated `InventoryService` (no implementation logic yet).
- [ ] T005 Update Dexie schema in `src/storage/storage.ts`:
   - Increment version number
   - Ensure tables `categories`, `products`, `lots`, `stockMovements` include new fields defined in contracts
- [ ] T006 [P] Add Zod validation schemas for `Category`, `Product`, `Lot`, `StockMovement` in `src/shared/validation/inventory.ts`
- No se creará una carpeta `__tests__` vacía; los tests se añadirán junto con cada regla de dominio en la fase correspondiente.


---

## Phase 3: User Story 1 - Gestión de categorías y productos (Priority: P1) 🎯 MVP

**Goal**: Owner can CRUD categories and products; Seller can view them.

**Independent Test**: Create a category and product, verify they appear in UI and persist after reload.

### Implementation Tasks

- [ ] T008 [US1] Implement `Category` domain model in `src/features/inventory/domain/category.ts`
- [ ] T009 [US1] Implement `Product` domain model in `src/features/inventory/domain/product.ts`
- [ ] T010 [US1] Add CRUD service methods in `src/features/inventory/domain/inventoryService.ts` for categories and products (create, edit, delete, list)
- [ ] T011 [US1] Create UI components `CategoryList.tsx`, `CategoryForm.tsx`, `ProductList.tsx`, `ProductForm.tsx` under `src/features/inventory/ui/`
- [ ] T012 [US1] Guard UI actions with permission checks using `AuthService.can('manage_categories')` and `AuthService.can('manage_products')`
- [ ] T013 [P][US1] Write UI integration tests for category/product management in `src/features/inventory/__tests__/uiCategoryProduct.test.tsx`
- [ ] T014 [US1] Update quickstart guide to reflect new UI flows (already aligned – verify content)

---

## Phase 4: User Story 2 - Registro y gestión de stock por lotes (Priority: P1)

**Goal**: Owner can receive lots, allocate stock for sales using PEPS, register waste and adjust stock; Seller can view stock.

**Independent Test**: Register two lots with different expiry dates, perform allocation, verify stock calculations.

### Implementation Tasks

- [ ] T015 [US2] Implement `Lot` domain model in `src/features/inventory/domain/lot.ts`
- [ ] T016 [US2] Implement `StockMovement` domain model in `src/features/inventory/domain/stockMovement.ts`
- [ ] T017 [US2] Add `receiveLot` method to `InventoryService` (creates receipt movement) in `src/features/inventory/domain/inventoryService.ts`
- [ ] T018 [US2] Add `allocateForSale` method (PEPS algorithm, rejects insufficient stock) in `InventoryService`
- [ ] T019 [US2] Add `registerWaste` method (creates waste movement) in `InventoryService`
- [ ] T020 [US2] Add `adjustStock` method (creates adjustment movement) in `InventoryService`
- [ ] T021 [US2] Create UI component `LotForm.tsx` for lot registration and `LotList.tsx` for viewing lots
- [ ] T022 [P][US2] Write unit tests for receipt, allocation, waste, and adjustment logic in `src/features/inventory/__tests__/stockLogic.test.ts`

---

## Phase 5: User Story 3 - Alertas de vencimiento (Priority: P2)

**Goal**: Owner receives alerts for lots nearing expiry; Seller sees no alerts.

**Independent Test**: Configure `expiryAlertDays`, create a lot within the window, verify it appears in alert list; verify expired lot is flagged.

### Implementation Tasks

- [ ] T023 [US3] Implement `listExpiringLots` method in `InventoryService` (calculates based on `expiryAlertDays`) in `src/features/inventory/domain/inventoryService.ts`
- [ ] T024 [US3] Create UI component `ExpirationAlerts.tsx` to display alerts for the Owner
- [ ] T025 [P][US3] Add tests for alert generation in `src/features/inventory/__tests__/alerts.test.ts`

---

## Phase 6: Polish & Cross‑Cutting Concerns

**Purpose**: Final touches and quality improvements

- [ ] T026 [P] Update project documentation (`README.md`, `docs/REGLAS.md`) with inventory module overview
- [ ] T027 Run lint, typecheck, and tests; fix any failures
- [ ] T028 [P] Execute quickstart validation script (`npm run dev && npm run test`) and confirm all steps pass

---

## Dependencies & Execution Order

- **Setup (Phase 1)** must finish before **Foundational (Phase 2)**.
- **Foundational (Phase 2)** must finish before any **User Story** phases.
- User stories can be worked on in parallel after Phase 2 is complete (tasks marked `[P]`).
- **Polish (Phase 6)** depends on completion of all story phases.

---

*All tasks follow the checklist format required by the workflow.*
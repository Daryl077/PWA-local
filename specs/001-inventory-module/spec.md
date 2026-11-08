# Feature Specification: Inventory Module

**Feature Branch**: `001-inventory-module`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "Crear el módulo de inventario para la Licorería PWA.

La aplicación es local, sin backend y funciona offline después de la primera carga. Los datos deben persistir en Dexie/IndexedDB.

Alcance de esta especificación:
- Catálogo de productos con nombre, categoría, precio de venta, costo, stock mínimo, favorito y estado activo.
- Categorías con nombre y días de alerta previa al vencimiento.
- Ingreso de mercadería por lote, con cantidad, fecha de vencimiento y costo unitario.
- Stock total calculado a partir de los movimientos de stock (StockMovement) asociados a los lotes.
- Consulta de existencias por producto.
- Alertas de lotes próximos a vencer usando el umbral configurado por categoría.
- Registro de mermas y baja de productos vencidos, con motivo y valor de pérdida.
- Rotación PEPS: al vender, primero se descuenta del lote con vencimiento más próximo.
- Un lote vencido no puede asignarse para venta.
- Si el stock disponible es insuficiente, la asignación para venta falla completamente; no se permiten asignaciones parciales.

Debe cumplir la constitución:
- PWA local sin backend.
- Dexie/IndexedDB como almacén principal.
- Módulo inventory en src/features/inventory.
- Contratos en src/contracts.
- Acceso a datos solo mediante las interfaces de src/contracts.
- Permisos: solo el Dueño puede registrar ingresos de mercadería, mermas y ajustes; el Vendedor solo puede consultar productos y stock.
- Dinero en centavos enteros.
- Fechas de vencimiento en formato YYYY-MM-DD.
- Los movimientos de stock son inmutables; una corrección crea un movimiento nuevo.
- Toda funcionalidad debe tener pruebas con Vitest y Testing Library.
"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión de categorías y productos (Priority: P1)

El Dueño necesita crear, editar, activar/desactivar y listar categorías y productos. El Vendedor debe poder consultar el catálogo de productos.

**Why this priority**: Es la base del inventario; sin categorías y productos no hay stock que gestionar.

**Independent Test**: Crear una categoría y varios productos; verificar que aparecen en la lista y que los cambios persisten tras recargar la PWA.

**Acceptance Scenarios**:

1. **Given** que el Dueño está en la pantalla de categorías, **When** crea una nueva categoría con nombre y `expiryAlertDays`, **Then** la categoría aparece en la lista.
2. **Given** una categoría activa, **When** el Dueño crea un producto asignándole esa categoría y define precio, costo, stock mínimo, marca como favorito y lo activa, **Then** el producto queda registrado y visible para el Vendedor.
3. **Given** un producto existente, **When** el Dueño edita sus datos (precio, costo, stock mínimo, activo), **Then** los cambios se guardan y se reflejan en la vista del Vendedor.
4. **Given** que una categoría tiene productos asociados, **When** el Dueño intenta eliminarla, **Then** la acción es rechazada con un mensaje indicando que debe reasignar o eliminar los productos primero.

---

### User Story 2 - Registro y gestión de stock por lotes (Priority: P1)

El Dueño registra la llegada de mercadería mediante lotes; el Vendedor solo puede consultar el stock.

**Why this priority**: Gestionar el inventario de forma precisa es esencial para evitar pérdidas por vencimiento y garantizar disponibilidad.

**Independent Test**: Registrar dos lotes del mismo producto con diferentes fechas de vencimiento y validar que el stock total se calcula a partir de los movimientos de stock.

**Acceptance Scenarios**:

1. **Given** un producto activo, **When** el Dueño registra un lote con `quantity`, `expiryDate` (YYYY‑MM‑DD) y `unitCostCents`, **Then** se crea un `StockMovement` de tipo `receipt` y el stock total del producto aumenta en `quantity`.
2. **Given** varios lotes de un producto con distintas fechas de vencimiento, **When** se consulta el stock mediante `getStock`, **Then** la suma de los `quantity` de los movimientos `receipt` menos los de tipo `sale`, `waste` y `adjustment` se devuelve como stock total.
3. **Given** una venta que requiere Q unidades de un producto, **When** el módulo `sales` llama a `allocateForSale(productId, Q, today)`, **Then** el servicio `InventoryService` asigna lotes siguiendo la regla PEPS (el lote con vencimiento más próximo que no esté vencido) y devuelve la lista de asignaciones; si no hay stock suficiente, la llamada falla con error `INSUFFICIENT_STOCK` y no se modifica ningún `StockMovement`.
4. **Given** un lote cuya `expiryDate` es anterior a la fecha actual, **When** el Dueño intenta asignarlo en una venta, **Then** el lote es excluido del algoritmo PEPS; si todos los lotes están vencidos, la asignación falla completamente.
5. **Given** un lote con fecha de vencimiento pasada, **When** el Dueño registra el lote mediante `receiveLot`, **Then** se muestra una advertencia y el lote se guarda solo si el Dueño confirma explícitamente la acción.

---

### User Story 3 - Alertas de vencimiento (Priority: P2)

El Dueño debe ser notificado sobre lotes próximos a vencerse según el umbral configurado en su categoría.

**Why this priority**: Permite al Dueño tomar acciones preventivas (ofertas, descartes) y reducir merma.

**Independent Test**: Configurar una categoría con `expiryAlertDays` de 30 días, crear un lote que vence en 20 días y verificar que aparece en la lista de alertas obtenida mediante `listExpiringLots`.

**Acceptance Scenarios**:

1. **Given** una categoría con `expiryAlertDays` de N días, **When** se crea o actualiza un lote cuyo `expiryDate` está a menos de N días de la fecha actual, **Then** el lote aparece en la lista devuelta por `listExpiringLots`.
2. **Given** un lote ya vencido, **When** se visualiza la lista de alertas, **Then** el lote se muestra marcado como "Vencido".
3. **Given** que el Vendedor visualiza la pantalla de alertas, **When** el módulo muestra la lista, **Then** la vista está vacía (las alertas son solo para el Dueño).

---

## Edge Cases

- **Múltiples lotes con la misma fecha de vencimiento**: El algoritmo PEPS los trata de forma secuencial según el orden de registro.
- **Intento de registrar un lote con fecha de vencimiento anterior**: Se muestra una advertencia; el registro solo procede si el Dueño confirma explícitamente.
- **Eliminación de una categoría**: Bloqueada mientras existan productos asociados; se requiere reasignar o eliminar dichos productos primero.
- **Venta con cantidad exacta al stock total disponible**: La asignación se completa exitosamente; el stock queda en cero.
- **Actualización del `expiryAlertDays` de una categoría**: Las alertas existentes se recalculan automáticamente la próxima vez que se abra la vista de alertas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema **MUST** permitir al Dueño crear, editar, activar y desactivar categorías, incluyendo el campo `expiryAlertDays` (días de alerta previa al vencimiento).
- **FR-002**: El sistema **MUST** permitir al Dueño crear, editar, activar y desactivar productos, vinculándolos a una categoría existente y especificando `priceCents`, `costCents`, `minStock`, `isFavorite` y `active`.
- **FR-003**: El sistema **MUST** permitir al Dueño registrar lotes mediante `receiveLot(productId, { quantity, expiryDate, unitCostCents, userId })`; este método crea un `StockMovement` de tipo `receipt`.
- **FR-004**: El sistema **MUST** calcular el stock total de cada producto como la suma de todas las cantidades de `StockMovement` relacionadas (receipts menos sales, waste y adjustments).
- **FR-005**: El sistema **MUST** proporcionar una consulta de existencias mediante `getStock(productId, today)` que devuelva el stock total calculado.
- **FR-006**: El sistema **MUST** exponer `allocateForSale(productId, quantity, today)` que asigna lotes siguiendo la regla PEPS; si el stock disponible es insuficiente, la llamada falla con `INSUFFICIENT_STOCK` y no modifica ningún movimiento.
- **FR-007**: El sistema **MUST** generar alertas de vencimiento mediante `listExpiringLots(today)` que devuelve los lotes cuya `expiryDate` está dentro del `expiryAlertDays` de su categoría; los lotes vencidos se marcan como "Vencido".
- **FR-008**: El sistema **MUST** permitir al Dueño registrar mermas mediante `registerWaste({ lotId, quantity, reason, lossCents, userId })`; el `reason` debe ser uno de `expired`, `broken` o `other` y se crea un `StockMovement` de tipo `waste`.
- **FR-009**: El sistema **MUST** permitir al Dueño ajustar stock mediante `adjustStock({ lotId, delta, reason, userId })` que crea un `StockMovement` de tipo `adjustment`.
- **FR-010**: El sistema **MUST** impedir que un lote vencido sea asignado para venta; dichos lotes son excluidos del algoritmo PEPS.
- **FR-011**: El sistema **MUST** validar que los campos monetarios se manejen en centavos enteros y que las fechas de vencimiento cumplan el formato `YYYY-MM-DD`.
- **FR-012**: El sistema **MUST** respetar los permisos: solo el Dueño puede ejecutar `receiveLot`, `registerWaste` y `adjustStock`; el Vendedor solo puede ejecutar `getStock` y `listExpiringLots` (acción `view_stock`).
- **FR-013**: El sistema **MUST** incluir pruebas unitarias y de integración con Vitest y Testing Library para cada flujo descrito.

### Key Entities *(include if feature involves data)*

- **Category**: `id`, `name`, `expiryAlertDays`.
- **Product**: `id`, `categoryId`, `name`, `priceCents`, `costCents`, `minStock`, `isFavorite`, `active`, `description?`.
- **Lot**: `id`, `productId`, `expiryDate` (YYYY‑MM‑DD), `unitCostCents`, `receivedAt` (ISO‑8601).
- **StockMovement**: `id`, `productId`, `lotId`, `occurredAt`, `userId`, plus one of:
  - `type: 'receipt'` with `quantity`.
  - `type: 'sale'` with `quantity` and `saleId`.
  - `type: 'waste'` with `quantity`, `reason` (`expired`|`broken`|`other`), `lossCents`.
  - `type: 'adjustment'` with `delta` and `reason`.
- **WasteReason**: `expired`, `broken`, `other`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El Dueño puede registrar una categoría y su primer producto en menos de 2 minutos.
- **SC-002**: La consulta de stock mediante `getStock` se completa en menos de 200 ms en dispositivos móviles típicos.
- **SC-003**: El 100 % de los lotes que vencen dentro del `expiryAlertDays` configurado aparecen en la lista devuelta por `listExpiringLots`.
- **SC-004**: Al intentar una asignación para venta con stock insuficiente, la llamada a `allocateForSale` devuelve error `INSUFFICIENT_STOCK` en ≤ 100 ms y no modifica ningún `StockMovement`.
- **SC-005**: Las pruebas automatizadas cubren al menos el 90 % de los casos de PEPS, registro de lotes, mermas, ajustes y alertas.
- **SC-006**: Los permisos se verifican mediante pruebas que aseguran que el Vendedor no puede ejecutar `receiveLot`, `registerWaste` ni `adjustStock` y que el Dueño sí puede.

## Assumptions

- La aplicación se ejecuta en navegadores modernos que soportan IndexedDB y Service Workers.
- Sólo hay un usuario activo por dispositivo (Dueño o Vendedor); no se manejan conflictos de concurrencia multi‑usuario.
- Los umbrales de alerta (`expiryAlertDays`) son valores positivos en días; el valor por defecto es 30 días si no se especifica.
- Las pruebas se ejecutan en entornos de desarrollo con `fake-indexeddb` para simular IndexedDB.

---

**Version**: 1.2.0 | **Ratified**: 2026-11-07 | **Last Amended**: 2026-11-07

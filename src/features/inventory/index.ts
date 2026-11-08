// Puerta pública del módulo de inventario (INV-003).
// Otros módulos solo pueden entrar por aquí o por src/contracts/.
// `domain/` y `ui/` son internos hasta que una tarea agregue algo público.
export { createInventoryFake, fakeInventoryService } from './fake'
export type { ExpiringLot, InventoryService, LotAllocation } from '../../contracts/services'

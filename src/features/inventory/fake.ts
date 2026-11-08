import type { AppError, Result } from '../../contracts/common'
import type { Category, Lot, Product, StockMovement } from '../../contracts/entities'
import type { ExpiringLot, InventoryService, LotAllocation } from '../../contracts/services'

/** Error común mientras el fake solo cubre el contrato. */
function featureNotReady(action: string): AppError {
  return {
    code: 'INVENTORY_FAKE_NOT_IMPLEMENTED',
    what: `El inventario simulado todavía no puede ${action}.`,
    why: 'Esta versión en memoria solo existe para probar los contratos entre módulos.',
    how: 'Usa la implementación real cuando esté lista o amplía el fake en la tarea correspondiente.',
  }
}

/**
 * Versión en memoria de InventoryService (INV-001 e INV-002). No usa Dexie ni
 * implementa PEPS, stock, alertas, catálogo, mermas ni ajustes reales.
 */
export function createInventoryFake(): InventoryService {
  return {
    async getStock(): Promise<number> {
      return 0
    },

    async allocateForSale(): Promise<Result<LotAllocation[]>> {
      return { ok: false, error: featureNotReady('asignar lotes para una venta') }
    },

    async listExpiringLots(): Promise<ExpiringLot[]> {
      return []
    },

    async listCategories(): Promise<Category[]> {
      return []
    },

    async createCategory(): Promise<Result<Category>> {
      return { ok: false, error: featureNotReady('crear una categoría') }
    },

    async updateCategory(): Promise<Result<Category>> {
      return { ok: false, error: featureNotReady('editar una categoría') }
    },

    async deleteCategory(): Promise<Result<void>> {
      return { ok: false, error: featureNotReady('eliminar una categoría') }
    },

    async listProducts(): Promise<Product[]> {
      return []
    },

    async createProduct(): Promise<Result<Product>> {
      return { ok: false, error: featureNotReady('crear un producto') }
    },

    async updateProduct(): Promise<Result<Product>> {
      return { ok: false, error: featureNotReady('editar un producto') }
    },

    async deleteProduct(): Promise<Result<void>> {
      return { ok: false, error: featureNotReady('eliminar un producto') }
    },

    async registerWaste(): Promise<Result<StockMovement>> {
      return { ok: false, error: featureNotReady('registrar una merma') }
    },

    async receiveLot(): Promise<Result<Lot>> {
      return { ok: false, error: featureNotReady('recibir un lote') }
    },

    async adjustStock(): Promise<Result<StockMovement>> {
      return { ok: false, error: featureNotReady('ajustar el stock') }
    },
  }
}

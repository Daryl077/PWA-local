import type { Id } from '../../../contracts/common'
import type { Product, StockMovement } from '../../../contracts/entities'
import type { ProductInput } from './schemas'

/** Crea un producto nuevo sin modificar los datos de entrada. */
export function createProduct(id: Id, input: ProductInput): Product {
  return {
    id,
    name: input.name.trim(),
    categoryId: input.categoryId,
    priceCents: input.priceCents,
    costCents: input.costCents,
    minStock: input.minStock,
    isFavorite: input.isFavorite,
    active: input.active,
  }
}

/** Aplica solo los cambios enviados y conserva el resto del producto. */
export function updateProduct(product: Product, changes: Partial<ProductInput>): Product {
  return {
    id: product.id,
    name: changes.name === undefined ? product.name : changes.name.trim(),
    categoryId: changes.categoryId === undefined ? product.categoryId : changes.categoryId,
    priceCents: changes.priceCents === undefined ? product.priceCents : changes.priceCents,
    costCents: changes.costCents === undefined ? product.costCents : changes.costCents,
    minStock: changes.minStock === undefined ? product.minStock : changes.minStock,
    isFavorite: changes.isFavorite === undefined ? product.isFavorite : changes.isFavorite,
    active: changes.active === undefined ? product.active : changes.active,
  }
}

/**
 * Un producto solo se puede borrar cuando ningún movimiento lo usa.
 * Si ya tiene movimientos, el servicio debe desactivarlo en vez de borrarlo.
 */
export function canDeleteProduct(productId: Id, movements: readonly StockMovement[]): boolean {
  return !movements.some((movement) => movement.productId === productId)
}

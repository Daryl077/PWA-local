import type { Id } from '../../../contracts/common'
import type { Category, Product } from '../../../contracts/entities'
import type { CategoryInput } from './schemas'

/** Crea una categoría nueva sin modificar los datos de entrada. */
export function createCategory(id: Id, input: CategoryInput): Category {
  return {
    id,
    name: input.name.trim(),
    expiryAlertDays: input.expiryAlertDays,
  }
}

/** Aplica solo los cambios enviados y conserva el resto de la categoría. */
export function updateCategory(category: Category, changes: Partial<CategoryInput>): Category {
  return {
    id: category.id,
    name: changes.name === undefined ? category.name : changes.name.trim(),
    expiryAlertDays:
      changes.expiryAlertDays === undefined ? category.expiryAlertDays : changes.expiryAlertDays,
  }
}

/** Una categoría solo se puede borrar cuando ningún producto la usa. */
export function canDeleteCategory(categoryId: Id, products: readonly Product[]): boolean {
  return !products.some((product) => product.categoryId === categoryId)
}

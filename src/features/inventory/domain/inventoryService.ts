import type { AppError, Cents, Id, Result } from '../../../contracts/common'
import type { Category, Product } from '../../../contracts/entities'
import type { AuthService, InventoryService } from '../../../contracts/services'
import type { Storage } from '../../../contracts/storage'
import { canDeleteCategory, createCategory, updateCategory } from './category'
import { canDeleteProduct, createProduct, updateProduct } from './product'
import {
  categoryInputSchema,
  partialCategoryInputSchema,
  partialProductInputSchema,
  productInputSchema,
  type CategoryInput,
  type ProductInput,
} from './schemas'

type UpdateCategoryInput = {
  id: Id
  name?: string
  expiryAlertDays?: number
}

type UpdateProductInput = {
  id: Id
  name?: string
  categoryId?: Id
  priceCents?: Cents
  costCents?: Cents
  minStock?: number
  isFavorite?: boolean
  active?: boolean
}

/**
 * Casos de uso del catálogo (INV-009a e INV-009b). Categorías completas y
 * productos completos. Lotes y movimientos se agregan en tareas posteriores.
 */
export class InventoryServiceImpl implements Pick<
  InventoryService,
  | 'listCategories'
  | 'createCategory'
  | 'updateCategory'
  | 'deleteCategory'
  | 'listProducts'
  | 'createProduct'
  | 'updateProduct'
  | 'deleteProduct'
> {
  constructor(
    private readonly storage: Storage,
    private readonly auth: AuthService,
  ) {}

  async listCategories(): Promise<Category[]> {
    return await this.storage.repositories.categories.list()
  }

  async createCategory(input: CategoryInput): Promise<Result<Category>> {
    if (!this.auth.can('manage_categories')) {
      return { ok: false, error: notAuthorizedError() }
    }

    const parsed = categoryInputSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.issues[0]?.message) }
    }

    const category = createCategory(globalThis.crypto.randomUUID(), parsed.data)
    const normalizedName = normalizeName(category.name)

    return await this.storage.transaction(async (repos): Promise<Result<Category>> => {
      const categories = await repos.categories.list()
      const nameTaken = categories.some(
        (existing) => normalizeName(existing.name) === normalizedName,
      )

      if (nameTaken) {
        return { ok: false, error: categoryNameTakenError() }
      }

      await repos.categories.put(category)
      return { ok: true, value: category }
    })
  }

  async updateCategory(input: UpdateCategoryInput): Promise<Result<Category>> {
    if (!this.auth.can('manage_categories')) {
      return { ok: false, error: notAuthorizedError() }
    }

    const parsed = partialCategoryInputSchema.safeParse({
      name: input.name,
      expiryAlertDays: input.expiryAlertDays,
    })
    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.issues[0]?.message) }
    }

    return await this.storage.transaction(async (repos): Promise<Result<Category>> => {
      const existing = await repos.categories.get(input.id)
      if (existing === undefined) {
        return { ok: false, error: categoryNotFoundError() }
      }

      if (parsed.data.name !== undefined) {
        const normalizedName = normalizeName(parsed.data.name)
        const categories = await repos.categories.list()
        const nameTaken = categories.some(
          (category) => category.id !== input.id && normalizeName(category.name) === normalizedName,
        )

        if (nameTaken) {
          return { ok: false, error: categoryNameTakenError() }
        }
      }

      const updated = updateCategory(existing, parsed.data)
      await repos.categories.put(updated)
      return { ok: true, value: updated }
    })
  }

  async deleteCategory(id: Id): Promise<Result<void>> {
    if (!this.auth.can('manage_categories')) {
      return { ok: false, error: notAuthorizedError() }
    }

    return await this.storage.transaction(async (repos): Promise<Result<void>> => {
      const category = await repos.categories.get(id)
      if (category === undefined) {
        return { ok: false, error: categoryNotFoundError() }
      }

      const products = await repos.products.list()
      if (!canDeleteCategory(id, products)) {
        return { ok: false, error: categoryHasProductsError() }
      }

      await repos.categories.delete(id)
      return { ok: true, value: undefined }
    })
  }

  async listProducts(): Promise<Product[]> {
    return await this.storage.repositories.products.list()
  }

  async createProduct(input: ProductInput): Promise<Result<Product>> {
    if (!this.auth.can('manage_products')) {
      return { ok: false, error: productNotAuthorizedError() }
    }

    const parsed = productInputSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: productValidationError(parsed.error.issues[0]?.message) }
    }

    const product = createProduct(globalThis.crypto.randomUUID(), parsed.data)

    return await this.storage.transaction(async (repos): Promise<Result<Product>> => {
      const category = await repos.categories.get(product.categoryId)
      if (category === undefined) {
        return { ok: false, error: productCategoryNotFoundError() }
      }

      await repos.products.put(product)
      return { ok: true, value: product }
    })
  }

  async updateProduct(input: UpdateProductInput): Promise<Result<Product>> {
    if (!this.auth.can('manage_products')) {
      return { ok: false, error: productNotAuthorizedError() }
    }

    const parsed = partialProductInputSchema.safeParse({
      name: input.name,
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      costCents: input.costCents,
      minStock: input.minStock,
      isFavorite: input.isFavorite,
      active: input.active,
    })
    if (!parsed.success) {
      return { ok: false, error: productValidationError(parsed.error.issues[0]?.message) }
    }

    return await this.storage.transaction(async (repos): Promise<Result<Product>> => {
      const existing = await repos.products.get(input.id)
      if (existing === undefined) {
        return { ok: false, error: productNotFoundError() }
      }

      if (parsed.data.categoryId !== undefined) {
        const category = await repos.categories.get(parsed.data.categoryId)
        if (category === undefined) {
          return { ok: false, error: productCategoryNotFoundError() }
        }
      }

      const changes = pickSentProductChanges(input, parsed.data)
      const updated = updateProduct(existing, changes)
      await repos.products.put(updated)
      return { ok: true, value: updated }
    })
  }

  async deleteProduct(id: Id): Promise<Result<void>> {
    if (!this.auth.can('manage_products')) {
      return { ok: false, error: productNotAuthorizedError() }
    }

    return await this.storage.transaction(async (repos): Promise<Result<void>> => {
      const product = await repos.products.get(id)
      if (product === undefined) {
        return { ok: false, error: productNotFoundError() }
      }

      const movements = await repos.stockMovements.list()
      if (canDeleteProduct(id, movements)) {
        await repos.products.delete(id)
        return { ok: true, value: undefined }
      }

      const deactivated = updateProduct(product, { active: false })
      await repos.products.put(deactivated)
      return { ok: true, value: undefined }
    })
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * `partialProductInputSchema` conserva los valores por defecto de `isFavorite` y
 * `active`. Este filtro aplica solo los campos que la persona envió de verdad.
 */
function pickSentProductChanges(
  input: UpdateProductInput,
  parsed: Partial<ProductInput>,
): Partial<ProductInput> {
  const changes: Partial<ProductInput> = {}

  if (parsed.name !== undefined) changes.name = parsed.name
  if (parsed.categoryId !== undefined) changes.categoryId = parsed.categoryId
  if (parsed.priceCents !== undefined) changes.priceCents = parsed.priceCents
  if (parsed.costCents !== undefined) changes.costCents = parsed.costCents
  if (parsed.minStock !== undefined) changes.minStock = parsed.minStock

  if (input.isFavorite !== undefined && parsed.isFavorite !== undefined) {
    changes.isFavorite = parsed.isFavorite
  }
  if (input.active !== undefined && parsed.active !== undefined) {
    changes.active = parsed.active
  }

  return changes
}

function validationError(detail?: string): AppError {
  return {
    code: 'VALIDATION_ERROR',
    what: 'No se pudo guardar la categoría porque los datos no son válidos.',
    why: detail ?? 'Los datos de la categoría no son válidos.',
    how: 'Corrige el campo indicado y vuelve a intentar.',
  }
}

function notAuthorizedError(): AppError {
  return {
    code: 'INVENTORY_NOT_AUTHORIZED',
    what: 'No se pudo completar la operación con categorías.',
    why: 'Solo el Dueño puede crear, editar o eliminar categorías.',
    how: 'Pide al Dueño que haga el cambio o que revise tus permisos.',
  }
}

function categoryNotFoundError(): AppError {
  return {
    code: 'INVENTORY_CATEGORY_NOT_FOUND',
    what: 'No se encontró la categoría.',
    why: 'La categoría que intentas cambiar ya no existe en este dispositivo.',
    how: 'Actualiza la lista de categorías y vuelve a intentar con una que exista.',
  }
}

function categoryNameTakenError(): AppError {
  return {
    code: 'INVENTORY_CATEGORY_NAME_TAKEN',
    what: 'No se pudo guardar la categoría porque el nombre ya está en uso.',
    why: 'Otra categoría tiene el mismo nombre, aunque cambien mayúsculas o espacios.',
    how: 'Elige un nombre distinto para distinguirla en las listas.',
  }
}

function categoryHasProductsError(): AppError {
  return {
    code: 'INVENTORY_CATEGORY_HAS_PRODUCTS',
    what: 'No se pudo eliminar la categoría.',
    why: 'Todavía tiene productos asociados y borrarla dejaría productos sin categoría.',
    how: 'Mueve o elimina primero esos productos, y luego vuelve a intentar.',
  }
}

function productValidationError(detail?: string): AppError {
  return {
    code: 'VALIDATION_ERROR',
    what: 'No se pudo guardar el producto porque los datos no son válidos.',
    why: detail ?? 'Los datos del producto no son válidos.',
    how: 'Corrige el campo indicado y vuelve a intentar.',
  }
}

function productNotAuthorizedError(): AppError {
  return {
    code: 'INVENTORY_NOT_AUTHORIZED',
    what: 'No se pudo completar la operación con productos.',
    why: 'Solo el Dueño puede crear, editar o eliminar productos.',
    how: 'Pide al Dueño que haga el cambio o que revise tus permisos.',
  }
}

function productCategoryNotFoundError(): AppError {
  return {
    code: 'INVENTORY_CATEGORY_NOT_FOUND',
    what: 'No se encontró la categoría del producto.',
    why: 'La categoría seleccionada ya no existe en este dispositivo.',
    how: 'Actualiza la lista de categorías y elige una que exista.',
  }
}

function productNotFoundError(): AppError {
  return {
    code: 'INVENTORY_PRODUCT_NOT_FOUND',
    what: 'No se encontró el producto.',
    why: 'El producto que intentas cambiar ya no existe en este dispositivo.',
    how: 'Actualiza la lista de productos y vuelve a intentar con uno que exista.',
  }
}

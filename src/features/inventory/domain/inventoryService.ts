import type { ZodNumber, ZodObject, ZodString } from 'zod'

import type { AppError, Id, Result } from '../../../contracts/common'
import type { Category } from '../../../contracts/entities'
import type { AuthService, InventoryService } from '../../../contracts/services'
import type { Storage } from '../../../contracts/storage'
import { canDeleteCategory, createCategory, updateCategory } from './category'
import { categoryInputSchema, type CategoryInput } from './schemas'

type UpdateCategoryInput = {
  id: Id
  name?: string
  expiryAlertDays?: number
}

/**
 * `categoryInputSchema` se declara como `z.ZodType<CategoryInput>` en schemas.ts,
 * así que TypeScript no ve `.partial()`. En tiempo de ejecución sí es un ZodObject;
 * este cast solo recupera esa forma sin duplicar ninguna regla de validación.
 */
const partialCategoryInputSchema = (
  categoryInputSchema as unknown as ZodObject<{
    name: ZodString
    expiryAlertDays: ZodNumber
  }>
).partial()

/**
 * Casos de uso del catálogo (INV-009a). Solo categorías: los productos, lotes y
 * movimientos se agregan en tareas posteriores.
 */
export class InventoryServiceImpl implements Pick<
  InventoryService,
  'listCategories' | 'createCategory' | 'updateCategory' | 'deleteCategory'
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
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
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

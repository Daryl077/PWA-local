import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'

import type { Action, AuthService } from '../../../contracts/services'
import { StorageImpl } from '../../../storage/storage'
import { InventoryServiceImpl } from './inventoryService'
import type { ProductInput } from './schemas'

function createAuth(canManage: boolean, action: Action = 'manage_categories'): AuthService {
  return {
    can: (requested: Action) => canManage && requested === action,
  } as unknown as AuthService
}

function makeProductInput(categoryId: string, overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: 'Cerveza 620 ml',
    categoryId,
    priceCents: 1500,
    costCents: 900,
    minStock: 6,
    isFavorite: false,
    active: true,
    ...overrides,
  }
}

let storage: StorageImpl
let service: InventoryServiceImpl

beforeEach(async () => {
  storage = new StorageImpl()
  await storage.db.open()
  await storage.db.categories.clear()
  await storage.db.products.clear()
  service = new InventoryServiceImpl(storage, createAuth(true))
})

describe('listCategories', () => {
  it('devuelve las categorías guardadas', async () => {
    const cervezas = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    const vinos = { id: crypto.randomUUID(), name: 'Vinos', expiryAlertDays: 60 }

    await storage.repositories.categories.put(cervezas)
    await storage.repositories.categories.put(vinos)

    const categories = await service.listCategories()

    expect(categories).toHaveLength(2)
    expect(categories.map((category) => category.name).sort()).toEqual(['Cervezas', 'Vinos'])
  })
})

describe('createCategory', () => {
  it('guarda una categoría y devuelve el id generado', async () => {
    const result = await service.createCategory({ name: '  Cervezas  ', expiryAlertDays: 30 })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.id).toEqual(expect.any(String))
    expect(result.value.name).toBe('Cervezas')
    await expect(storage.repositories.categories.get(result.value.id)).resolves.toEqual(
      result.value,
    )
  })

  it('rechaza datos inválidos con un mensaje en español', async () => {
    const result = await service.createCategory({ name: 'A', expiryAlertDays: 30 })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('VALIDATION_ERROR')
    expect(result.error.why).toContain('demasiado corto')
  })

  it('rechaza un nombre duplicado sin importar espacios ni mayúsculas', async () => {
    await storage.repositories.categories.put({
      id: crypto.randomUUID(),
      name: 'Cervezas',
      expiryAlertDays: 30,
    })

    const result = await service.createCategory({ name: '  cervezas  ', expiryAlertDays: 45 })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_CATEGORY_NAME_TAKEN')
  })

  it('rechaza a un Vendedor', async () => {
    service = new InventoryServiceImpl(storage, createAuth(false))

    const result = await service.createCategory({ name: 'Vinos', expiryAlertDays: 60 })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_NOT_AUTHORIZED')
  })
})

describe('updateCategory', () => {
  it('cambia solo el nombre y conserva el id y los días de alerta', async () => {
    const original = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(original)

    const result = await service.updateCategory({
      id: original.id,
      name: '  Cervezas artesanales  ',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value).toEqual({
      id: original.id,
      name: 'Cervezas artesanales',
      expiryAlertDays: 30,
    })
    await expect(storage.repositories.categories.get(original.id)).resolves.toEqual(result.value)
  })

  it('cambia solo los días de alerta y conserva el nombre', async () => {
    const original = { id: crypto.randomUUID(), name: 'Vinos', expiryAlertDays: 60 }
    await storage.repositories.categories.put(original)

    const result = await service.updateCategory({ id: original.id, expiryAlertDays: 90 })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value).toEqual({ id: original.id, name: 'Vinos', expiryAlertDays: 90 })
  })

  it('acepta un cambio parcial de días de alerta igual a cero', async () => {
    const original = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(original)

    const result = await service.updateCategory({ id: original.id, expiryAlertDays: 0 })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value).toEqual({ id: original.id, name: 'Cervezas', expiryAlertDays: 0 })
  })

  it('rechaza una categoría que no existe', async () => {
    const result = await service.updateCategory({ id: crypto.randomUUID(), name: 'Vinos' })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_CATEGORY_NOT_FOUND')
  })

  it('rechaza un nombre usado por otra categoría', async () => {
    const cervezas = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    const vinos = { id: crypto.randomUUID(), name: 'Vinos', expiryAlertDays: 60 }
    await storage.repositories.categories.put(cervezas)
    await storage.repositories.categories.put(vinos)

    const result = await service.updateCategory({ id: vinos.id, name: '  cervezas ' })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_CATEGORY_NAME_TAKEN')
  })
})

describe('deleteCategory', () => {
  it('rechaza eliminar una categoría con productos asociados', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)
    await storage.repositories.products.put({
      id: crypto.randomUUID(),
      name: 'Cerveza 620 ml',
      categoryId: category.id,
      priceCents: 1500,
      costCents: 900,
      minStock: 6,
      isFavorite: false,
      active: true,
    })

    const result = await service.deleteCategory(category.id)

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_CATEGORY_HAS_PRODUCTS')
    await expect(storage.repositories.categories.get(category.id)).resolves.toEqual(category)
  })

  it('elimina una categoría sin productos', async () => {
    const category = { id: crypto.randomUUID(), name: 'Vinos', expiryAlertDays: 60 }
    await storage.repositories.categories.put(category)

    const result = await service.deleteCategory(category.id)

    expect(result.ok).toBe(true)
    await expect(storage.repositories.categories.get(category.id)).resolves.toBeUndefined()
  })
})

describe('listProducts', () => {
  it('devuelve los productos guardados, incluidos los inactivos', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)
    await storage.repositories.products.put({
      ...makeProductInput(category.id, { name: 'Cerveza 620 ml' }),
      id: crypto.randomUUID(),
    })
    await storage.repositories.products.put({
      ...makeProductInput(category.id, { name: 'Cerveza antigua', active: false }),
      id: crypto.randomUUID(),
    })

    service = new InventoryServiceImpl(storage, createAuth(false))

    const products = await service.listProducts()

    expect(products).toHaveLength(2)
    expect(products.map((product) => product.name).sort()).toEqual([
      'Cerveza 620 ml',
      'Cerveza antigua',
    ])
    expect(products.some((product) => product.active === false)).toBe(true)
  })
})

describe('createProduct', () => {
  it('guarda un producto con id generado, nombre recortado y todos los campos', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)
    const input = makeProductInput(category.id, {
      name: '  Cerveza 620 ml  ',
      isFavorite: true,
    })

    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.createProduct(input)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.id).toEqual(expect.any(String))
    expect(result.value.name).toBe('Cerveza 620 ml')
    expect(result.value).toEqual({
      ...input,
      id: result.value.id,
      name: 'Cerveza 620 ml',
    })
    expect(input.name).toBe('  Cerveza 620 ml  ')
    await expect(storage.repositories.products.get(result.value.id)).resolves.toEqual(result.value)
  })

  it('rechaza datos inválidos con un mensaje en español', async () => {
    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.createProduct(makeProductInput(crypto.randomUUID(), { name: 'A' }))

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('VALIDATION_ERROR')
    expect(result.error.why).toContain('demasiado corto')
  })

  it('rechaza a un Vendedor', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)

    service = new InventoryServiceImpl(storage, createAuth(false, 'manage_products'))

    const result = await service.createProduct(makeProductInput(category.id))

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_NOT_AUTHORIZED')
    await expect(storage.repositories.products.list()).resolves.toEqual([])
  })

  it('rechaza una categoría inexistente y no guarda nada', async () => {
    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.createProduct(makeProductInput(crypto.randomUUID()))

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_CATEGORY_NOT_FOUND')
    await expect(storage.repositories.products.list()).resolves.toEqual([])
  })
})

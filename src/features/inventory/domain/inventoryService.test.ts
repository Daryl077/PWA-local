import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'

import type { AppError, Result } from '../../../contracts/common'
import type { Product, StockMovement, UserInfo } from '../../../contracts/entities'
import type { Action, AuthService } from '../../../contracts/services'
import { StorageImpl } from '../../../storage/storage'
import { InventoryServiceImpl } from './inventoryService'
import type { ProductInput } from './schemas'

function stubNotImplemented(): AppError {
  return {
    code: 'AUTH_STUB_NOT_IMPLEMENTED',
    what: 'Método no implementado en el stub de autenticación de pruebas.',
    why: 'El stub solo implementa can(), que es lo único que InventoryServiceImpl usa.',
    how: 'No se necesitan los demás métodos de AuthService en estas pruebas.',
  }
}

function createAuth(canManage: boolean, action: Action = 'manage_categories'): AuthService {
  return {
    currentUser: (): UserInfo | null => null,
    login: async (): Promise<Result<UserInfo>> => ({ ok: false, error: stubNotImplemented() }),
    logout: (): void => {},
    lock: (): void => {},
    can: (requested: Action): boolean => canManage && requested === action,
    createSeller: async (): Promise<Result<UserInfo>> => ({
      ok: false,
      error: stubNotImplemented(),
    }),
    setSellerActive: async (): Promise<Result<UserInfo>> => ({
      ok: false,
      error: stubNotImplemented(),
    }),
    listSellers: async (): Promise<UserInfo[]> => [],
  }
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

function makeProduct(categoryId: string, overrides: Partial<Product> = {}): Product {
  return {
    id: crypto.randomUUID(),
    ...makeProductInput(categoryId),
    ...overrides,
  }
}

function makeReceiptMovement(productId: string): StockMovement {
  return {
    id: crypto.randomUUID(),
    productId,
    lotId: crypto.randomUUID(),
    occurredAt: '2026-11-09T12:00:00.000Z',
    userId: crypto.randomUUID(),
    type: 'receipt',
    quantity: 10,
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

describe('updateProduct', () => {
  it('cambia solo el precio y conserva el resto de los campos y el id', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)
    const product = makeProduct(category.id, { isFavorite: true, active: false })
    await storage.repositories.products.put(product)
    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.updateProduct({ id: product.id, priceCents: 1800 })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value).toEqual({ ...product, priceCents: 1800 })
  })

  it('cambia el nombre y lo recorta', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)
    const product = makeProduct(category.id)
    await storage.repositories.products.put(product)
    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.updateProduct({
      id: product.id,
      name: '  Cerveza artesanal  ',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value).toEqual({ ...product, name: 'Cerveza artesanal' })
  })

  it('cambia la categoría a una existente', async () => {
    const cervezas = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    const vinos = { id: crypto.randomUUID(), name: 'Vinos', expiryAlertDays: 60 }
    await storage.repositories.categories.put(cervezas)
    await storage.repositories.categories.put(vinos)
    const product = makeProduct(cervezas.id)
    await storage.repositories.products.put(product)
    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.updateProduct({ id: product.id, categoryId: vinos.id })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value).toEqual({ ...product, categoryId: vinos.id })
  })

  it('rechaza un producto inexistente', async () => {
    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.updateProduct({
      id: crypto.randomUUID(),
      name: 'Cerveza artesanal',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_PRODUCT_NOT_FOUND')
  })

  it('rechaza una categoría inexistente al cambiar la categoría', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)
    const product = makeProduct(category.id)
    await storage.repositories.products.put(product)
    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.updateProduct({
      id: product.id,
      categoryId: crypto.randomUUID(),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_CATEGORY_NOT_FOUND')
    await expect(storage.repositories.products.get(product.id)).resolves.toEqual(product)
  })

  it('rechaza a un Vendedor', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)
    const product = makeProduct(category.id)
    await storage.repositories.products.put(product)
    service = new InventoryServiceImpl(storage, createAuth(false, 'manage_products'))

    const result = await service.updateProduct({ id: product.id, priceCents: 1800 })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_NOT_AUTHORIZED')
    await expect(storage.repositories.products.get(product.id)).resolves.toEqual(product)
  })

  it('rechaza datos inválidos', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)
    const product = makeProduct(category.id)
    await storage.repositories.products.put(product)
    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.updateProduct({ id: product.id, priceCents: -1 })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('deleteProduct', () => {
  it('elimina un producto sin movimientos', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)
    const product = makeProduct(category.id)
    await storage.repositories.products.put(product)
    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.deleteProduct(product.id)

    expect(result.ok).toBe(true)
    await expect(storage.repositories.products.get(product.id)).resolves.toBeUndefined()
  })

  it('desactiva un producto con movimientos y conserva el registro', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)
    const product = makeProduct(category.id)
    await storage.repositories.products.put(product)
    const movement = makeReceiptMovement(product.id)
    await storage.repositories.stockMovements.add(movement)
    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.deleteProduct(product.id)

    expect(result.ok).toBe(true)
    await expect(storage.repositories.products.get(product.id)).resolves.toEqual({
      ...product,
      active: false,
    })
    await expect(storage.repositories.stockMovements.list()).resolves.toEqual([movement])
  })

  it('rechaza un producto inexistente', async () => {
    service = new InventoryServiceImpl(storage, createAuth(true, 'manage_products'))

    const result = await service.deleteProduct(crypto.randomUUID())

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_PRODUCT_NOT_FOUND')
  })

  it('rechaza a un Vendedor', async () => {
    const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }
    await storage.repositories.categories.put(category)
    const product = makeProduct(category.id)
    await storage.repositories.products.put(product)
    service = new InventoryServiceImpl(storage, createAuth(false, 'manage_products'))

    const result = await service.deleteProduct(product.id)

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('INVENTORY_NOT_AUTHORIZED')
    await expect(storage.repositories.products.get(product.id)).resolves.toEqual(product)
  })
})

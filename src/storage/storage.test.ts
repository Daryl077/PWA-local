import { describe, expect, it, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StorageImpl } from './storage'

describe('StorageImpl (Integration)', () => {
  let storage: StorageImpl

  beforeEach(async () => {
    storage = new StorageImpl()
    await storage.db.open()
    await storage.db.settings.clear()
    await storage.db.categories.clear()
    await storage.db.products.clear()
    await storage.db.lots.clear()
  })

  it('permite guardar y recuperar un ajuste (CRUD básico)', async () => {
    const id = crypto.randomUUID()
    const setting = { id, value: { theme: 'dark' } }

    await storage.repositories.settings.put(setting)
    const retrieved = await storage.repositories.settings.get(id)

    expect(retrieved).toEqual(setting)
  })

  it('está abierta la base de datos', async () => {
    expect(storage.db.isOpen()).toBe(true)
  })

  it('asegura la atomicidad en una transacción', async () => {
    const id1 = crypto.randomUUID()
    const setting1 = { id: id1, value: 'A' }
    const id2 = crypto.randomUUID()
    const setting2 = { id: id2, value: 'B' }

    try {
      await storage.transaction(async (repos) => {
        await repos.settings.put(setting1)
        await repos.settings.put(setting2)
        throw new Error('Simulated failure')
      })
    } catch (e) {
      expect(e).toBeDefined()
    }

    const r1 = await storage.repositories.settings.get(id1)
    const r2 = await storage.repositories.settings.get(id2)

    expect(r1).toBeUndefined()
    expect(r2).toBeUndefined()
  })

  describe('delete de Repository', () => {
    it('elimina una categoría por id', async () => {
      const category = { id: crypto.randomUUID(), name: 'Cervezas', expiryAlertDays: 30 }

      await storage.repositories.categories.put(category)
      await storage.repositories.categories.delete(category.id)

      await expect(storage.repositories.categories.get(category.id)).resolves.toBeUndefined()
      await expect(storage.repositories.categories.list()).resolves.toEqual([])
    })

    it('elimina un producto por id', async () => {
      const product = {
        id: crypto.randomUUID(),
        name: 'Cerveza 620 ml',
        categoryId: crypto.randomUUID(),
        priceCents: 1500,
        costCents: 900,
        minStock: 6,
        isFavorite: false,
        active: true,
      }

      await storage.repositories.products.put(product)
      await storage.repositories.products.delete(product.id)

      await expect(storage.repositories.products.get(product.id)).resolves.toBeUndefined()
      await expect(storage.repositories.products.list()).resolves.toEqual([])
    })

    it('elimina un lote por id', async () => {
      const lot = {
        id: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        expiryDate: '2026-12-10',
        unitCostCents: 900,
        receivedAt: '2026-11-08T12:00:00.000Z',
      }

      await storage.repositories.lots.put(lot)
      await storage.repositories.lots.delete(lot.id)

      await expect(storage.repositories.lots.get(lot.id)).resolves.toBeUndefined()
      await expect(storage.repositories.lots.list()).resolves.toEqual([])
    })
  })
})

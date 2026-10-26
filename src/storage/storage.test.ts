import { describe, expect, it, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StorageImpl } from './storage'

describe('StorageImpl (Integration)', () => {
  let storage: StorageImpl

  beforeEach(async () => {
    storage = new StorageImpl()
    await storage.db.open()
    await storage.db.settings.clear()
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
})

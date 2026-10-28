// @vitest-environment node
// Web Crypto (crypto.subtle) y fake-indexeddb no existen en jsdom.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'

import { StorageImpl } from '../../../storage/storage'
import { createOwner, hasOwner } from './first-run'
import { verifyPassword } from './password'

const VALID_INPUT = { name: '  Ana  ', password: 'clave-segura' }

let storage: StorageImpl

beforeEach(async () => {
  storage = new StorageImpl()
  await storage.db.open()
  await storage.db.users.clear()
})

describe('primer uso: crear al Dueño', () => {
  it('rechaza datos inválidos con un mensaje claro (RF-SEG-01)', async () => {
    const withoutName = await createOwner(storage, { name: '   ', password: 'clave-segura' })
    expect(withoutName.ok).toBe(false)
    if (!withoutName.ok) {
      expect(withoutName.error.code).toBe('INVALID_OWNER_INPUT')
      expect(withoutName.error.why).toContain('nombre')
      expect(withoutName.error.how).not.toBe('')
    }

    const shortPassword = await createOwner(storage, { name: 'Ana', password: 'corta' })
    expect(shortPassword.ok).toBe(false)
    if (!shortPassword.ok) {
      expect(shortPassword.error.why).toContain('contraseña')
    }

    expect(await storage.repositories.users.list()).toHaveLength(0)
  })

  it('crea un Dueño activo y guarda la contraseña con hash (RF-SEG-01)', async () => {
    const result = await createOwner(storage, VALID_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toMatchObject({ name: 'Ana', role: 'owner', active: true })
    expect(result.value).not.toHaveProperty('passwordHash')

    const [record] = await storage.repositories.users.list()
    expect(record?.passwordHash).not.toContain(VALID_INPUT.password)
    await expect(verifyPassword(VALID_INPUT.password, record?.passwordHash ?? '')).resolves.toBe(
      true,
    )
  })

  it('no permite crear un segundo Dueño (RF-SEG-01)', async () => {
    expect(await hasOwner(storage.repositories.users)).toBe(false)
    await createOwner(storage, VALID_INPUT)
    expect(await hasOwner(storage.repositories.users)).toBe(true)

    const second = await createOwner(storage, { name: 'Beto', password: 'otra-clave' })

    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error.code).toBe('OWNER_ALREADY_EXISTS')
    expect(await storage.repositories.users.list()).toHaveLength(1)
  })

  it('conserva al Dueño al reabrir el almacenamiento (T-005)', async () => {
    const created = await createOwner(storage, VALID_INPUT)
    expect(created.ok).toBe(true)
    storage.db.close()

    const reopened = new StorageImpl()
    await reopened.db.open()

    expect(await hasOwner(reopened.repositories.users)).toBe(true)
    const [record] = await reopened.repositories.users.list()
    expect(record?.name).toBe('Ana')
    reopened.db.close()
  })
})

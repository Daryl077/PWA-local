// @vitest-environment node
// Web Crypto (crypto.subtle) y fake-indexeddb no existen en jsdom.
import 'fake-indexeddb/auto'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { UserRecord } from '../../../contracts/entities'
import { StorageImpl } from '../../../storage/storage'
import { AuthServiceImpl } from './auth-service'
import { hashPassword } from './password'

const PASSWORD = 'clave-segura'

let passwordHash: string
let storage: StorageImpl
let auth: AuthServiceImpl
let owner: UserRecord

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD)
})

beforeEach(async () => {
  storage = new StorageImpl()
  await storage.db.open()
  await storage.db.users.clear()

  owner = {
    id: globalThis.crypto.randomUUID(),
    name: 'Ana',
    role: 'owner',
    active: true,
    passwordHash,
  }
  await storage.repositories.users.put(owner)
  auth = new AuthServiceImpl(storage)
})

function makeSeller(active: boolean): UserRecord {
  return {
    id: globalThis.crypto.randomUUID(),
    name: 'Beto',
    role: 'seller',
    active,
    passwordHash,
  }
}

describe('AuthService: login y logout', () => {
  it('inicia sesión con las credenciales correctas y no expone el hash (RF-SEG-01)', async () => {
    const result = await auth.login('Ana', PASSWORD)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({ id: owner.id, name: 'Ana', role: 'owner', active: true })
    expect(result.value).not.toHaveProperty('passwordHash')
    expect(auth.currentUser()).toEqual(result.value)
  })

  it('acepta el nombre con espacios y sin distinguir mayúsculas', async () => {
    const result = await auth.login('  ANA  ', PASSWORD)

    expect(result.ok).toBe(true)
    expect(auth.currentUser()?.name).toBe('Ana')
  })

  it('rechaza credenciales inválidas sin revelar si el nombre existe (RF-SEG-01)', async () => {
    const wrongPassword = await auth.login('Ana', 'incorrecta')
    const unknownUser = await auth.login('Beto', 'incorrecta')

    expect(wrongPassword.ok).toBe(false)
    expect(unknownUser.ok).toBe(false)
    if (wrongPassword.ok || unknownUser.ok) return

    expect(wrongPassword.error).toEqual(unknownUser.error)
    expect(wrongPassword.error.code).toBe('INVALID_CREDENTIALS')
    expect(wrongPassword.error.what).not.toBe('')
    expect(wrongPassword.error.why).not.toBe('')
    expect(wrongPassword.error.how).not.toBe('')
    expect(auth.currentUser()).toBeNull()
  })

  it('no permite abrir una segunda sesión sin cerrar la actual', async () => {
    await auth.login('Ana', PASSWORD)

    const second = await auth.login('Ana', PASSWORD)

    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error.code).toBe('SESSION_ALREADY_OPEN')
    expect(auth.currentUser()?.name).toBe('Ana')
  })

  it('un vendedor desactivado no puede iniciar sesión (RF-SEG-03)', async () => {
    await storage.repositories.users.put(makeSeller(false))

    const result = await auth.login('Beto', PASSWORD)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INVALID_CREDENTIALS')
    expect(auth.currentUser()).toBeNull()
  })

  it('logout cierra la sesión, quita el bloqueo y permite volver a entrar', async () => {
    await auth.login('Ana', PASSWORD)
    auth.lock()

    auth.logout()

    expect(auth.currentUser()).toBeNull()
    expect(auth.isLocked()).toBe(false)
    expect(auth.can('view_costs')).toBe(false)
    expect((await auth.login('Ana', PASSWORD)).ok).toBe(true)
  })

  it('lock bloquea la pantalla sin cerrar la sesión (RNF-PLA-09)', async () => {
    await auth.login('Ana', PASSWORD)

    auth.lock()

    expect(auth.currentUser()).toBeNull()
    expect(auth.isLocked()).toBe(true)
    expect(auth.can('view_costs')).toBe(false)
  })

  it('unlock rechaza la contraseña incorrecta y mantiene el bloqueo', async () => {
    await auth.login('Ana', PASSWORD)
    auth.lock()

    const result = await auth.unlock('incorrecta')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INVALID_PASSWORD')
    expect(auth.isLocked()).toBe(true)
  })

  it('unlock con la contraseña correcta reactiva la sesión', async () => {
    await auth.login('Ana', PASSWORD)
    auth.lock()

    const result = await auth.unlock(PASSWORD)

    expect(result.ok).toBe(true)
    expect(auth.currentUser()?.name).toBe('Ana')
    expect(auth.isLocked()).toBe(false)
    expect(auth.can('view_costs')).toBe(true)
  })

  it('unlock sin sesión devuelve NOT_AUTHENTICATED', async () => {
    const result = await auth.unlock(PASSWORD)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('NOT_AUTHENTICATED')
  })

  it('can aplica la matriz del rol de la sesión (RF-SEG-02 y RF-SEG-04)', async () => {
    expect(auth.can('sell')).toBe(false)
    await auth.login('Ana', PASSWORD)
    expect(auth.can('view_costs')).toBe(true)

    auth.logout()
    await storage.repositories.users.put(makeSeller(true))
    await auth.login('Beto', PASSWORD)

    expect(auth.can('sell')).toBe(true)
    expect(auth.can('view_costs')).toBe(false)
    expect(auth.can('manage_sellers')).toBe(false)
  })

  it('la sesión no se conserva al crear un servicio nuevo', async () => {
    await auth.login('Ana', PASSWORD)

    const restarted = new AuthServiceImpl(storage)

    expect(restarted.currentUser()).toBeNull()
  })
})

// @vitest-environment node
// Web Crypto (crypto.subtle) y fake-indexeddb no existen en jsdom.
import 'fake-indexeddb/auto'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { UserRecord } from '../../../contracts/entities'
import { StorageImpl } from '../../../storage/storage'
import { AuthServiceImpl } from './auth-service'
import { hashPassword, verifyPassword } from './password'

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

describe('AuthService: gestión de vendedores (RF-SEG-03)', () => {
  async function loginAsOwner(): Promise<void> {
    const result = await auth.login('Ana', PASSWORD)
    expect(result.ok).toBe(true)
  }

  async function sellerCount(): Promise<number> {
    const users = await storage.repositories.users.list()
    return users.filter((user) => user.role === 'seller').length
  }

  it('el Dueño crea un vendedor activo con la contraseña guardada como hash', async () => {
    await loginAsOwner()

    const result = await auth.createSeller('  Carla  ', 'clave-vendedor')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toMatchObject({ name: 'Carla', role: 'seller', active: true })
    expect(result.value).not.toHaveProperty('passwordHash')

    const stored = await storage.repositories.users.get(result.value.id)
    expect(stored?.name).toBe('Carla')
    expect(stored?.passwordHash).not.toContain('clave-vendedor')
    expect(await verifyPassword('clave-vendedor', stored?.passwordHash ?? '')).toBe(true)
  })

  it('el vendedor creado puede iniciar sesión', async () => {
    await loginAsOwner()
    const created = await auth.createSeller('Carla', 'clave-vendedor')
    expect(created.ok).toBe(true)

    auth.logout()
    const login = await auth.login('  CARLA  ', 'clave-vendedor')

    expect(login.ok).toBe(true)
    if (login.ok) expect(login.value.role).toBe('seller')
  })

  it('rechaza nombre y contraseña fuera de rango y no guarda nada', async () => {
    await loginAsOwner()

    const shortName = await auth.createSeller('A', 'clave-vendedor')
    const shortPassword = await auth.createSeller('Carla', 'corta')

    for (const result of [shortName, shortPassword]) {
      expect(result.ok).toBe(false)
      if (result.ok) continue
      expect(result.error.code).toBe('INVALID_SELLER_INPUT')
      expect(result.error.why).not.toBe('')
      expect(result.error.how).not.toBe('')
    }
    expect(await sellerCount()).toBe(0)
  })

  it('solo el Dueño puede crear vendedores', async () => {
    const seller = makeSeller(true)
    await storage.repositories.users.put(seller)
    await auth.login('Beto', PASSWORD)

    const asSeller = await auth.createSeller('Carla', 'clave-vendedor')

    auth.logout()
    const anonymous = await auth.createSeller('Carla', 'clave-vendedor')

    for (const result of [asSeller, anonymous]) {
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('NOT_AUTHORIZED')
    }
    expect(await sellerCount()).toBe(1)
  })

  it('no permite nombres repetidos sin distinguir mayúsculas ni espacios', async () => {
    await loginAsOwner()
    await auth.createSeller('Beto', 'clave-vendedor')

    const duplicateSeller = await auth.createSeller('  BETO  ', 'otra-clave')
    const duplicateOwner = await auth.createSeller('  ana  ', 'otra-clave')

    for (const result of [duplicateSeller, duplicateOwner]) {
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('SELLER_NAME_TAKEN')
    }
    expect(await sellerCount()).toBe(1)
  })

  it('el Dueño lista solo vendedores y sin el hash de la contraseña', async () => {
    await loginAsOwner()
    await auth.createSeller('Carla', 'clave-vendedor')
    await auth.createSeller('Beto', 'clave-vendedor')

    const sellers = await auth.listSellers()

    expect(sellers.map((seller) => seller.name).sort()).toEqual(['Beto', 'Carla'])
    for (const seller of sellers) {
      expect(seller.role).toBe('seller')
      expect(seller).not.toHaveProperty('passwordHash')
    }
  })

  it('un Vendedor no puede listar vendedores', async () => {
    const seller = makeSeller(true)
    await storage.repositories.users.put(seller)
    await auth.login('Beto', PASSWORD)

    expect(await auth.listSellers()).toEqual([])
  })

  it('el Dueño desactiva y reactiva; el desactivado no puede iniciar sesión', async () => {
    await loginAsOwner()
    const created = await auth.createSeller('Carla', 'clave-vendedor')
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const deactivated = await auth.setSellerActive(created.value.id, false)
    expect(deactivated.ok).toBe(true)
    if (deactivated.ok) expect(deactivated.value.active).toBe(false)

    auth.logout()
    const blockedLogin = await auth.login('Carla', 'clave-vendedor')
    expect(blockedLogin.ok).toBe(false)
    if (!blockedLogin.ok) expect(blockedLogin.error.code).toBe('INVALID_CREDENTIALS')

    await auth.login('Ana', PASSWORD)
    const reactivated = await auth.setSellerActive(created.value.id, true)
    expect(reactivated.ok).toBe(true)
    if (reactivated.ok) expect(reactivated.value.active).toBe(true)

    auth.logout()
    expect((await auth.login('Carla', 'clave-vendedor')).ok).toBe(true)
  })

  it('el Dueño no puede desactivarse a sí mismo', async () => {
    await loginAsOwner()

    const result = await auth.setSellerActive(owner.id, false)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('CANNOT_DEACTIVATE_OWNER')
    expect((await storage.repositories.users.get(owner.id))?.active).toBe(true)
  })

  it('un Vendedor no puede activar ni desactivar cuentas', async () => {
    const seller = makeSeller(true)
    await storage.repositories.users.put(seller)
    await auth.login('Beto', PASSWORD)

    const result = await auth.setSellerActive(seller.id, false)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('NOT_AUTHORIZED')
    expect((await storage.repositories.users.get(seller.id))?.active).toBe(true)
  })

  it('no permite cambiar una cuenta que no existe', async () => {
    await loginAsOwner()

    const result = await auth.setSellerActive(globalThis.crypto.randomUUID(), false)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('SELLER_NOT_FOUND')
  })
})

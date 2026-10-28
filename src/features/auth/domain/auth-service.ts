import type { AppError, Id, Result } from '../../../contracts/common'
import type { UserInfo, UserRecord } from '../../../contracts/entities'
import type { Action, AuthService } from '../../../contracts/services'
import type { Storage } from '../../../contracts/storage'
import { can } from './permissions'
import { hashPassword, verifyPassword } from './password'
import { sellerInputSchema } from './seller-input'

/**
 * Autenticación local (RF-SEG-01). La sesión vive en memoria: al recargar la
 * app hay que volver a entrar, que es lo más seguro en un dispositivo compartido.
 * El bloqueo rápido (RNF-PLA-09) conserva la sesión, pero niega los permisos
 * hasta que se escribe otra vez la contraseña del usuario actual.
 */
export class AuthServiceImpl implements AuthService {
  private session: UserInfo | null = null
  private locked = false

  constructor(private readonly storage: Storage) {}

  currentUser(): UserInfo | null {
    // Mientras está bloqueada no hay identidad usable: solo el desbloqueo la restaura.
    return this.session && !this.locked ? { ...this.session } : null
  }

  async login(name: string, password: string): Promise<Result<UserInfo>> {
    if (this.session) return { ok: false, error: sessionAlreadyOpenError() }

    const normalizedName = name.trim().toLowerCase()
    const users = await this.storage.repositories.users.list()
    const record = users.find((user) => user.name.trim().toLowerCase() === normalizedName)

    if (!record?.active) return { ok: false, error: invalidCredentialsError() }

    if (!(await verifyPassword(password, record.passwordHash))) {
      return { ok: false, error: invalidCredentialsError() }
    }

    this.session = toUserInfo(record)
    return { ok: true, value: { ...this.session } }
  }

  logout(): void {
    this.session = null
    this.locked = false
  }

  /** Bloquea la pantalla sin cerrar la sesión (RNF-PLA-09). */
  lock(): void {
    if (this.session) this.locked = true
  }

  isLocked(): boolean {
    return this.locked
  }

  /**
   * Desbloquea con la contraseña del usuario actual. Si la cuenta fue
   * desactivada mientras estaba bloqueada, cierra la sesión.
   */
  async unlock(password: string): Promise<Result<UserInfo>> {
    if (!this.session) return { ok: false, error: notAuthenticatedError() }
    if (!this.locked) return { ok: true, value: { ...this.session } }

    const record = await this.storage.repositories.users.get(this.session.id)

    if (!record?.active) {
      this.logout()
      return { ok: false, error: accountUnavailableError() }
    }

    if (!(await verifyPassword(password, record.passwordHash))) {
      return { ok: false, error: invalidPasswordError() }
    }

    this.locked = false
    return { ok: true, value: { ...this.session } }
  }

  can(action: Action): boolean {
    return this.session && !this.locked ? can(this.session.role, action) : false
  }

  /** El Dueño crea un vendedor activo (RF-SEG-03). */
  async createSeller(name: string, password: string): Promise<Result<UserInfo>> {
    if (this.currentUser()?.role !== 'owner') return { ok: false, error: notAuthorizedError() }

    const parsed = sellerInputSchema.safeParse({ name, password })
    if (!parsed.success) {
      const detail = parsed.error.issues[0]?.message
      return { ok: false, error: invalidSellerInputError(detail) }
    }

    // El hash se calcula fuera de la transacción para no bloquear IndexedDB.
    const passwordHash = await hashPassword(parsed.data.password)
    const record: UserRecord = {
      id: globalThis.crypto.randomUUID(),
      name: parsed.data.name,
      role: 'seller',
      active: true,
      passwordHash,
    }

    const created = await this.storage.transaction(async (repos) => {
      const users = await repos.users.list()
      const normalizedName = record.name.trim().toLowerCase()
      const nameExists = users.some((user) => user.name.trim().toLowerCase() === normalizedName)

      if (nameExists) return false

      await repos.users.put(record)
      return true
    })

    return created
      ? { ok: true, value: toUserInfo(record) }
      : { ok: false, error: nameTakenError() }
  }

  /** El Dueño activa o desactiva a un vendedor; su propia cuenta queda protegida. */
  async setSellerActive(id: Id, active: boolean): Promise<Result<UserInfo>> {
    if (this.currentUser()?.role !== 'owner') return { ok: false, error: notAuthorizedError() }

    const record = await this.storage.repositories.users.get(id)
    if (!record) return { ok: false, error: sellerNotFoundError() }
    if (record.role === 'owner') return { ok: false, error: ownerProtectedError() }
    if (record.active === active) return { ok: true, value: toUserInfo(record) }

    const updated: UserRecord = { ...record, active }
    await this.storage.repositories.users.put(updated)

    return { ok: true, value: toUserInfo(updated) }
  }

  /** Solo el Dueño ve la lista de vendedores (RF-SEG-03). */
  async listSellers(): Promise<UserInfo[]> {
    if (this.currentUser()?.role !== 'owner') return []

    const users = await this.storage.repositories.users.list()

    return users.filter((user) => user.role === 'seller').map(toUserInfo)
  }
}

function invalidCredentialsError() {
  return {
    code: 'INVALID_CREDENTIALS',
    what: 'No se pudo iniciar sesión.',
    why: 'El nombre o la contraseña no son correctos, o la cuenta está desactivada.',
    how: 'Revisa tus datos e inténtalo otra vez. Si tu cuenta fue desactivada, pide al Dueño que la active.',
  }
}

function sessionAlreadyOpenError() {
  return {
    code: 'SESSION_ALREADY_OPEN',
    what: 'No se puede iniciar otra sesión.',
    why: 'Ya hay un usuario con la sesión abierta en este dispositivo.',
    how: 'Cierra la sesión actual antes de entrar con otro usuario.',
  }
}

function notAuthorizedError(): AppError {
  return {
    code: 'NOT_AUTHORIZED',
    what: 'Solo el Dueño puede gestionar vendedores.',
    why: 'La sesión actual no es del Dueño o no hay una sesión abierta.',
    how: 'Inicia sesión con la cuenta del Dueño y vuelve a intentarlo.',
  }
}

function invalidSellerInputError(detail = 'Los datos del vendedor no son válidos.'): AppError {
  return {
    code: 'INVALID_SELLER_INPUT',
    what: 'No se pudo crear el vendedor.',
    why: detail,
    how: 'Revisa el nombre y la contraseña, y vuelve a intentarlo.',
  }
}

function nameTakenError(): AppError {
  return {
    code: 'SELLER_NAME_TAKEN',
    what: 'No se pudo crear el vendedor.',
    why: 'Ya existe una cuenta con ese nombre en este dispositivo.',
    how: 'Elige otro nombre para el vendedor y vuelve a intentarlo.',
  }
}

function sellerNotFoundError(): AppError {
  return {
    code: 'SELLER_NOT_FOUND',
    what: 'No se encontró al vendedor.',
    why: 'La cuenta que intentas cambiar ya no existe en este dispositivo.',
    how: 'Actualiza la lista de vendedores y vuelve a intentarlo.',
  }
}

function ownerProtectedError(): AppError {
  return {
    code: 'CANNOT_DEACTIVATE_OWNER',
    what: 'No se puede desactivar la cuenta del Dueño.',
    why: 'El Dueño no puede desactivarse a sí mismo ni quedar sin acceso al local.',
    how: 'Deja la cuenta del Dueño activa y desactiva solo cuentas de vendedores.',
  }
}

function invalidPasswordError() {
  return {
    code: 'INVALID_PASSWORD',
    what: 'No se pudo desbloquear la pantalla.',
    why: 'La contraseña no es correcta.',
    how: 'Escríbela otra vez. Si no la recuerdas, cierra la sesión y entra de nuevo.',
  }
}

function notAuthenticatedError() {
  return {
    code: 'NOT_AUTHENTICATED',
    what: 'No hay una sesión abierta.',
    why: 'La pantalla bloqueada pertenece a una sesión que ya se cerró.',
    how: 'Entra con tu usuario y contraseña.',
  }
}

function accountUnavailableError() {
  return {
    code: 'ACCOUNT_UNAVAILABLE',
    what: 'No se pudo desbloquear la pantalla.',
    why: 'Tu cuenta ya no existe o fue desactivada.',
    how: 'Cierra la sesión y pide al Dueño que revise tu cuenta.',
  }
}

function toUserInfo(record: UserRecord): UserInfo {
  return { id: record.id, name: record.name, role: record.role, active: record.active }
}

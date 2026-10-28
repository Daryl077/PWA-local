import type { Result } from '../../../contracts/common'
import type { UserInfo, UserRecord } from '../../../contracts/entities'
import type { Action, AuthService } from '../../../contracts/services'
import type { Storage } from '../../../contracts/storage'
import { can } from './permissions'
import { verifyPassword } from './password'

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

  /** T-014 implementa la creación de vendedores. */
  async createSeller(): Promise<Result<UserInfo>> {
    return { ok: false, error: sellerManagementPendingError() }
  }

  /** T-014 implementa la activación y desactivación de vendedores. */
  async setSellerActive(): Promise<Result<UserInfo>> {
    return { ok: false, error: sellerManagementPendingError() }
  }

  async listSellers(): Promise<UserInfo[]> {
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

function sellerManagementPendingError() {
  return {
    code: 'NOT_AVAILABLE',
    what: 'La gestión de vendedores todavía no está disponible.',
    why: 'Esta versión solo permite iniciar y cerrar sesión.',
    how: 'Usa la cuenta del Dueño por ahora. La gestión de vendedores llegará en una próxima actualización.',
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

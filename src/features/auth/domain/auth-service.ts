import type { Result } from '../../../contracts/common'
import type { UserInfo, UserRecord } from '../../../contracts/entities'
import type { Action, AuthService } from '../../../contracts/services'
import type { Storage } from '../../../contracts/storage'
import { can } from './permissions'
import { verifyPassword } from './password'

/**
 * Autenticación local (RF-SEG-01). La sesión vive en memoria: al recargar la
 * app hay que volver a entrar, que es lo más seguro en un dispositivo compartido.
 */
export class AuthServiceImpl implements AuthService {
  private session: UserInfo | null = null

  constructor(private readonly storage: Storage) {}

  currentUser(): UserInfo | null {
    return this.session ? { ...this.session } : null
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
  }

  /** T-013b lo reemplazará por un bloqueo que se desbloquea con la contraseña. */
  lock(): void {
    this.session = null
  }

  can(action: Action): boolean {
    return this.session ? can(this.session.role, action) : false
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

function toUserInfo(record: UserRecord): UserInfo {
  return { id: record.id, name: record.name, role: record.role, active: record.active }
}

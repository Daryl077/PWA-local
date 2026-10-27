import { z } from 'zod'

import type { AppError, Result } from '../../../contracts/common'
import type { UserInfo, UserRecord } from '../../../contracts/entities'
import type { Repository, Storage } from '../../../contracts/storage'
import { hashPassword } from './password'

const ownerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Escribe tu nombre: al menos 2 caracteres.')
    .max(60, 'El nombre no puede tener más de 60 caracteres.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(128, 'La contraseña no puede tener más de 128 caracteres.'),
})

export type FirstRunInput = z.infer<typeof ownerSchema>

/** Indica si este dispositivo ya tiene una cuenta de Dueño (RF-SEG-01). */
export async function hasOwner(users: Repository<UserRecord>): Promise<boolean> {
  const savedUsers = await users.list()

  return savedUsers.some((user) => user.role === 'owner')
}

/**
 * Crea al Dueño una sola vez (RF-SEG-01). Valida con Zod, guarda la contraseña
 * con hash y comprueba dentro de la transacción que no exista otro Dueño.
 */
export async function createOwner(storage: Storage, input: unknown): Promise<Result<UserInfo>> {
  const parsed = ownerSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: invalidInputError(parsed.error.issues[0]?.message) }
  }

  const passwordHash = await hashPassword(parsed.data.password)
  const record: UserRecord = {
    id: globalThis.crypto.randomUUID(),
    name: parsed.data.name,
    role: 'owner',
    active: true,
    passwordHash,
  }

  const created = await storage.transaction(async (repositories) => {
    if (await hasOwner(repositories.users)) return null

    await repositories.users.put(record)
    return record
  })

  if (!created) return { ok: false, error: ownerAlreadyExistsError() }

  return { ok: true, value: toUserInfo(created) }
}

function invalidInputError(detail: string | undefined): AppError {
  return {
    code: 'INVALID_OWNER_INPUT',
    what: 'No se pudo crear el Dueño.',
    why: detail ?? 'Los datos del formulario no son válidos.',
    how: 'Revisa tu nombre y tu contraseña, y vuelve a intentarlo.',
  }
}

function ownerAlreadyExistsError(): AppError {
  return {
    code: 'OWNER_ALREADY_EXISTS',
    what: 'No se puede crear otro Dueño.',
    why: 'Este dispositivo ya tiene una cuenta de Dueño.',
    how: 'Inicia sesión con la cuenta existente o restaura un respaldo.',
  }
}

function toUserInfo(record: UserRecord): UserInfo {
  return { id: record.id, name: record.name, role: record.role, active: record.active }
}

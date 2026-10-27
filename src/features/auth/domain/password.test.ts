// @vitest-environment node
// Web Crypto (crypto.subtle) no existe en jsdom; Node sí lo trae, y es el
// mismo API que usan los navegadores.
import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest'

import { hashPassword, verifyPassword } from './password'

const PASSWORD = 'Cerveza-620ml'
let storedHash: string

beforeAll(async () => {
  storedHash = await hashPassword(PASSWORD)
})

describe('hashPassword', () => {
  it('nunca guarda la contraseña en texto plano (RF-SEG-01)', () => {
    expect(storedHash).not.toContain(PASSWORD)
    // pbkdf2-sha256 + iteraciones + sal de 16 bytes + hash de 32 bytes, en hexadecimal.
    expect(storedHash).toMatch(/^pbkdf2-sha256\$600000\$[0-9a-f]{32}\$[0-9a-f]{64}$/)
  })

  it('usa una sal nueva en cada hash de la misma contraseña', async () => {
    const anotherHash = await hashPassword(PASSWORD)

    expect(anotherHash).not.toBe(storedHash)
    await expect(verifyPassword(PASSWORD, anotherHash)).resolves.toBe(true)
  })

  it('devuelve una promesa con el hash', () => {
    expectTypeOf(hashPassword).returns.toEqualTypeOf<Promise<string>>()

    const withNumber = () => {
      // @ts-expect-error La contraseña debe ser texto.
      void hashPassword(123)
    }

    expect(withNumber).toBeTypeOf('function')
  })
})

describe('verifyPassword', () => {
  it('acepta la contraseña correcta', async () => {
    await expect(verifyPassword(PASSWORD, storedHash)).resolves.toBe(true)
  })

  it('rechaza una contraseña incorrecta sin lanzar un error', async () => {
    await expect(verifyPassword('Cerveza-620ml ', storedHash)).resolves.toBe(false)
    await expect(verifyPassword('cerveza-620ml', storedHash)).resolves.toBe(false)
  })

  it('rechaza un hash alterado, vacío o en texto plano', async () => {
    const lastCharacter = storedHash.endsWith('0') ? '1' : '0'
    const alteredHash = `${storedHash.slice(0, -1)}${lastCharacter}`

    await expect(verifyPassword(PASSWORD, alteredHash)).resolves.toBe(false)
    await expect(verifyPassword(PASSWORD, PASSWORD)).resolves.toBe(false)
    await expect(verifyPassword(PASSWORD, '')).resolves.toBe(false)
    await expect(verifyPassword(PASSWORD, 'pbkdf2-sha256$600000$sal$hash')).resolves.toBe(false)
  })

  it('devuelve una promesa con el resultado booleano', () => {
    expectTypeOf(verifyPassword).returns.toEqualTypeOf<Promise<boolean>>()
  })
})

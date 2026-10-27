const FORMAT = 'pbkdf2-sha256'
const KEY_ALGORITHM = 'PBKDF2'
const KEY_HASH = 'SHA-256'
const ITERATIONS = 600_000
const MIN_ITERATIONS = 100_000
const MAX_ITERATIONS = 5_000_000
const SALT_BYTES = 16
const KEY_BITS = 256

type ParsedHash = {
  iterations: number
  salt: Uint8Array<ArrayBuffer>
  hash: Uint8Array<ArrayBuffer>
}

/**
 * Guarda la contraseña con PBKDF2-SHA256, sal aleatoria e iteraciones (RF-SEG-01).
 * El texto de la contraseña nunca forma parte del resultado.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await deriveBytes(password, salt, ITERATIONS)

  return [FORMAT, ITERATIONS.toString(), toHex(salt), toHex(hash)].join('$')
}

/**
 * Comprueba una contraseña contra el hash guardado (RF-SEG-01).
 * Una contraseña incorrecta o un hash dañado devuelven `false`, sin lanzar errores.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parsed = parseStoredHash(storedHash)
  if (!parsed) return false

  const candidate = await deriveBytes(password, parsed.salt, parsed.iterations)

  return bytesEqual(candidate, parsed.hash)
}

async function deriveBytes(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    KEY_ALGORITHM,
    false,
    ['deriveBits'],
  )
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: KEY_ALGORITHM, salt, iterations, hash: KEY_HASH },
    keyMaterial,
    KEY_BITS,
  )

  return new Uint8Array(bits)
}

function parseStoredHash(storedHash: string): ParsedHash | null {
  const parts = storedHash.split('$')
  if (parts.length !== 4) return null

  const [format, iterationsText, saltHex, hashHex] = parts
  if (format !== FORMAT) return null
  if (!iterationsText || !saltHex || !hashHex) return null

  const iterations = parseIterations(iterationsText)
  const salt = fromHex(saltHex)
  const hash = fromHex(hashHex)
  if (iterations === null) return null
  if (!salt || !hash || !hasExpectedSize(salt, hash)) return null

  return { iterations, salt, hash }
}

function parseIterations(text: string): number | null {
  if (!/^\d+$/.test(text)) return null

  const iterations = Number(text)
  // Evita hashes manipulados con muy pocas o demasiadas iteraciones.
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) return null

  return iterations
}

function hasExpectedSize(salt: Uint8Array<ArrayBuffer>, hash: Uint8Array<ArrayBuffer>): boolean {
  return salt.length === SALT_BYTES && hash.length === KEY_BITS / 8
}

function bytesEqual(left: Uint8Array<ArrayBuffer>, right: Uint8Array<ArrayBuffer>): boolean {
  if (left.length !== right.length) return false

  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index]! ^ right[index]!
  }

  return difference === 0
}

function toHex(bytes: Uint8Array<ArrayBuffer>): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null

  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }

  return bytes
}

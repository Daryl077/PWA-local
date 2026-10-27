// Tipos base compartidos por todos los módulos (docs/CONTRATOS.md).

/** Identificador único creado con crypto.randomUUID(). */
export type Id = string

/** Entero en centavos de boliviano. El dinero nunca se guarda con decimales. */
export type Cents = number

/** Fecha sin hora de vencimiento, con formato 'YYYY-MM-DD'. */
export type IsoDate = string

/** Fecha y hora de un evento, en ISO 8601 UTC. */
export type IsoDateTime = string

/**
 * Error de negocio con la misma estructura en toda la app:
 * qué pasó (what), por qué (why) y cómo solucionarlo (how).
 */
export type AppError = {
  code: string
  what: string
  why: string
  how: string
}

/** Resultado explícito: el negocio falla sin lanzar excepciones. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError }

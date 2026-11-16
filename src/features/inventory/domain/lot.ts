import { z } from 'zod'

import type { AppError, IsoDate, Result } from '../../../contracts/common'
import type { Lot } from '../../../contracts/entities'

const idSchema = z.string().trim().min(1, 'El identificador no puede estar vacío.')

/** Fecha sin hora de vencimiento, con formato AAAA-MM-DD y existente en el calendario. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD.')
  .refine(isRealCalendarDate, 'La fecha no existe en el calendario.')

/** Fecha y hora de un evento en UTC, como se guardan los movimientos. */
export const isoDateTimeSchema = z
  .string()
  .refine(isIsoDateTime, 'La fecha y hora deben estar en formato ISO 8601 UTC.')

/**
 * Lote de mercadería (RF-INV-03). La cantidad no se guarda aquí: se deduce de
 * los movimientos del lote para que nunca quede un saldo editado a mano.
 */
export const lotSchema = z.object({
  id: idSchema,
  productId: idSchema,
  expiryDate: isoDateSchema,
  unitCostCents: z
    .number()
    .int('El costo unitario debe ser un entero en centavos.')
    .nonnegative('El costo unitario no puede ser negativo.'),
  receivedAt: isoDateTimeSchema,
})

/** Lote junto con la cantidad que le queda, calculada desde sus movimientos. */
export const lotStockSchema = lotSchema.extend({
  quantity: z.number().int().nonnegative('La cantidad no puede ser negativa.'),
})

export type LotStock = z.infer<typeof lotStockSchema>

/** Valida el lote antes de guardarlo (RF-INV-03). */
export function createLot(input: Lot): Result<Lot> {
  const parsed = lotSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: invalidLotError(parsed.error.issues[0]?.message) }

  return { ok: true, value: parsed.data }
}

/** Une el lote con su cantidad disponible para mostrarlo o venderlo (RF-INV-02). */
export function toLotStock(lot: Lot, quantity: number): Result<LotStock> {
  const parsed = lotStockSchema.safeParse({ ...lot, quantity })
  if (!parsed.success)
    return { ok: false, error: invalidLotStockError(parsed.error.issues[0]?.message) }

  return { ok: true, value: parsed.data }
}

/** Un lote está vencido cuando su fecha es anterior a hoy. El mismo día aún se vende (R-02). */
export function isLotExpired(lot: Lot, today: IsoDate): boolean {
  return lot.expiryDate < today
}

function invalidLotError(detail: string | undefined): AppError {
  return {
    code: 'INVALID_LOT',
    what: 'No se pudo registrar el lote.',
    why: detail ?? 'Los datos del lote no son válidos.',
    how: 'Revisa el producto, la fecha de vencimiento, el costo y la fecha de ingreso.',
  }
}

function invalidLotStockError(detail: string | undefined): AppError {
  return {
    code: 'INVALID_LOT_STOCK',
    what: 'No se pudo calcular la cantidad del lote.',
    why: detail ?? 'La cantidad del lote no es válida.',
    how: 'Revisa los movimientos del lote y vuelve a intentarlo.',
  }
}

function isIsoDateTime(value: string): boolean {
  return value.endsWith('Z') && !Number.isNaN(Date.parse(value))
}

function isRealCalendarDate(value: string): boolean {
  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (month < 1 || month > 12 || day < 1) return false

  return day <= daysInMonth(year, month)
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28

  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

import { z } from 'zod'

import type { AppError, Id, IsoDateTime, Result } from '../../../contracts/common'
import type { Lot, StockMovement, WasteReason } from '../../../contracts/entities'
import { isoDateTimeSchema } from './lot'

const idSchema = z.string().trim().min(1, 'El identificador no puede estar vacío.')

/** Cantidad de unidades enteras y mayor que cero. */
export const positiveQuantitySchema = z
  .number()
  .int('La cantidad debe ser un entero.')
  .positive('La cantidad debe ser mayor que cero.')

export const wasteReasonSchema = z.enum(
  ['expired', 'broken', 'other'],
  'El motivo de la merma debe ser vencido, roto u otro.',
)

const movementBaseSchema = z.object({
  id: idSchema,
  productId: idSchema,
  lotId: idSchema,
  occurredAt: isoDateTimeSchema,
  userId: idSchema,
})

const receiptMovementSchema = movementBaseSchema.extend({
  type: z.literal('receipt'),
  quantity: positiveQuantitySchema,
})

const saleMovementSchema = movementBaseSchema.extend({
  type: z.literal('sale'),
  quantity: positiveQuantitySchema,
  saleId: idSchema,
})

const wasteMovementSchema = movementBaseSchema.extend({
  type: z.literal('waste'),
  quantity: positiveQuantitySchema,
  reason: wasteReasonSchema,
  lossCents: z
    .number()
    .int('La pérdida debe ser un entero en centavos.')
    .nonnegative('La pérdida no puede ser negativa.'),
})

const adjustmentMovementSchema = movementBaseSchema.extend({
  type: z.literal('adjustment'),
  delta: z
    .number()
    .int('El ajuste debe ser un entero.')
    .refine((delta) => delta !== 0, 'El ajuste debe cambiar la cantidad.'),
  reason: z
    .string()
    .trim()
    .min(3, 'El motivo debe tener al menos 3 caracteres.')
    .max(200, 'El motivo no puede superar los 200 caracteres.'),
})

/** Unión validada de los cuatro tipos de movimiento de stock. */
export const stockMovementSchema = z.discriminatedUnion('type', [
  receiptMovementSchema,
  saleMovementSchema,
  wasteMovementSchema,
  adjustmentMovementSchema,
])

export type ReceiptMovement = Extract<StockMovement, { type: 'receipt' }>
export type SaleMovement = Extract<StockMovement, { type: 'sale' }>
export type WasteMovement = Extract<StockMovement, { type: 'waste' }>
export type AdjustmentMovement = Extract<StockMovement, { type: 'adjustment' }>

/** Un movimiento ya registrado no se edita ni se borra: solo se agrega otro. */
export type ImmutableStockMovement = Readonly<StockMovement>

type MovementInputBase = {
  id: Id
  lot: Lot
  userId: Id
  occurredAt: IsoDateTime
}

export type ReceiptMovementInput = MovementInputBase & { quantity: number }
export type SaleMovementInput = MovementInputBase & { quantity: number; saleId: Id }
export type WasteMovementInput = MovementInputBase & { quantity: number; reason: WasteReason }
export type AdjustmentMovementInput = MovementInputBase & { delta: number; reason: string }

/** Ingreso de unidades de un lote (RF-INV-02). */
export function createReceiptMovement(
  input: ReceiptMovementInput,
): Result<Readonly<ReceiptMovement>> {
  return parseMovement(
    receiptMovementSchema,
    { ...baseFields(input), type: 'receipt', quantity: input.quantity },
    'No se pudo registrar el ingreso del lote.',
  )
}

/** Salida de unidades por una venta; siempre referencia el lote y la venta (RF-INV-02). */
export function createSaleMovement(input: SaleMovementInput): Result<Readonly<SaleMovement>> {
  return parseMovement(
    saleMovementSchema,
    {
      ...baseFields(input),
      type: 'sale',
      quantity: input.quantity,
      saleId: input.saleId,
    },
    'No se pudo registrar la salida por venta.',
  )
}

/** Merma de un lote: guarda el motivo y calcula la pérdida con su costo (R-06). */
export function createWasteMovement(input: WasteMovementInput): Result<Readonly<WasteMovement>> {
  const lossCents = input.quantity * input.lot.unitCostCents

  return parseMovement(
    wasteMovementSchema,
    {
      ...baseFields(input),
      type: 'waste',
      quantity: input.quantity,
      reason: input.reason,
      lossCents,
    },
    'No se pudo registrar la merma.',
  )
}

/** Ajuste de inventario por conteo o corrección, con su motivo (RF-INV-05). */
export function createAdjustmentMovement(
  input: AdjustmentMovementInput,
): Result<Readonly<AdjustmentMovement>> {
  return parseMovement(
    adjustmentMovementSchema,
    {
      ...baseFields(input),
      type: 'adjustment',
      delta: input.delta,
      reason: input.reason,
    },
    'No se pudo registrar el ajuste de stock.',
  )
}

function baseFields(input: MovementInputBase): {
  id: Id
  productId: Id
  lotId: Id
  occurredAt: IsoDateTime
  userId: Id
} {
  return {
    id: input.id,
    productId: input.lot.productId,
    lotId: input.lot.id,
    occurredAt: input.occurredAt,
    userId: input.userId,
  }
}

function parseMovement<T>(
  schema: z.ZodType<T>,
  candidate: unknown,
  what: string,
): Result<Readonly<T>> {
  const parsed = schema.safeParse(candidate)
  if (!parsed.success) {
    return { ok: false, error: invalidMovementError(what, parsed.error.issues[0]?.message) }
  }

  return { ok: true, value: Object.freeze(parsed.data) }
}

function invalidMovementError(what: string, detail: string | undefined): AppError {
  return {
    code: 'INVALID_STOCK_MOVEMENT',
    what,
    why: detail ?? 'Los datos del movimiento no son válidos.',
    how: 'Revisa el lote, la cantidad, el motivo y el usuario que registra.',
  }
}

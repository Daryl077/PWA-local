import { z } from 'zod'

import type { Cents, Id, IsoDate, IsoDateTime } from '../../../contracts/common'
import type { Category, Product, StockMovement, WasteReason } from '../../../contracts/entities'
import type { InventoryService } from '../../../contracts/services'

export type CategoryInput = Omit<Category, 'id'>
export type ProductInput = Omit<Product, 'id'>
export type ReceiveLotInput = Omit<Parameters<InventoryService['receiveLot']>[0], 'acceptExpired'>
export type RegisterWasteInput = Parameters<InventoryService['registerWaste']>[0]
export type AdjustStockInput = Parameters<InventoryService['adjustStock']>[0]
export type StockMovementInput = StockMovement

/** Identificador obligatorio. */
function requiredId(label: string): z.ZodType<Id> {
  return z
    .string({
      error: `${label} es obligatorio. Sin este dato no se puede guardar el registro. Inclúyelo y vuelve a intentar.`,
    })
    .trim()
    .min(1, {
      message: `${label} es obligatorio. El campo llegó vacío; escribe un identificador válido.`,
    })
}

/** Nombre obligatorio, recortado y con un largo razonable. */
function requiredName(label: string, min: number, max: number): z.ZodString {
  return z
    .string({
      error: `${label} es obligatorio. Escribe un nombre de ${min} a ${max} caracteres para identificarlo.`,
    })
    .trim()
    .min(min, {
      message: `${label} es demasiado corto. Usa al menos ${min} caracteres para reconocerlo en las listas.`,
    })
    .max(max, {
      message: `${label} es demasiado largo. Usa ${max} caracteres o menos para que se vea completo en pantalla.`,
    })
}

/** Cantidad entera mayor que cero. */
function positiveInteger(label: string): z.ZodNumber {
  return z
    .number({
      error: `${label} debe ser un número entero. No se pueden usar fracciones de unidades; corrige el valor.`,
    })
    .int({
      message: `${label} debe ser un número entero. No se permiten decimales; corrige el valor.`,
    })
    .positive({
      message: `${label} debe ser mayor que cero. Usa al menos 1; sin unidades no hay movimiento.`,
    })
}

/** Entero mayor o igual a cero, para días o unidades. */
function nonNegativeInteger(label: string): z.ZodNumber {
  return z
    .number({
      error: `${label} debe ser un número entero. Usa unidades completas, sin decimales.`,
    })
    .int({
      message: `${label} debe ser un número entero. No se permiten decimales; corrige el valor.`,
    })
    .min(0, {
      message: `${label} no puede ser negativo. Usa 0 o más; un valor negativo no tiene sentido aquí.`,
    })
}

/** Monto entero en centavos, sin decimales y no negativo. */
function nonNegativeCents(label: string): z.ZodType<Cents> {
  return z
    .number({
      error: `${label} debe ser un monto entero en centavos. No uses decimales; por ejemplo, 1500 equivale a Bs 15,00.`,
    })
    .int({
      message: `${label} debe ser un monto entero en centavos, sin decimales. Corrige el valor.`,
    })
    .min(0, {
      message: `${label} no puede ser negativo. Usa 0 o más; un monto negativo no tiene sentido.`,
    })
}

/** Entero distinto de cero, para ajustes que suman o restan. */
function nonZeroInteger(label: string): z.ZodNumber {
  return z
    .number({
      error: `${label} debe ser un número entero. Usa unidades completas, sin decimales.`,
    })
    .int({
      message: `${label} debe ser un número entero. No se permiten decimales; corrige el valor.`,
    })
    .refine((value) => value !== 0, {
      message: `${label} no puede ser cero. Indica cuántas unidades sumar o restar; por ejemplo, 1 o -1.`,
    })
}

/** Motivo del ajuste, obligatorio y explicativo. */
function adjustmentReason(): z.ZodString {
  return z
    .string({
      error:
        'El motivo del ajuste es obligatorio. Explica por qué cambias el stock; por ejemplo, "Conteo físico".',
    })
    .trim()
    .min(3, {
      message:
        'El motivo del ajuste es demasiado corto. Escribe al menos 3 caracteres para saber por qué se ajustó el stock.',
    })
    .max(200, {
      message:
        'El motivo del ajuste es demasiado largo. Resúmelo en 200 caracteres o menos para que se pueda leer completo.',
    })
}

const expiryDateSchema: z.ZodType<IsoDate> = z.iso.date({
  error:
    'La fecha de vencimiento no es válida. Usa el formato AAAA-MM-DD y una fecha real; por ejemplo, 2026-12-31.',
})

const occurredAtSchema: z.ZodType<IsoDateTime> = z.iso.datetime({
  error:
    'La fecha del movimiento no es válida. Usa una fecha y hora ISO 8601 en UTC; por ejemplo, 2026-11-08T12:00:00.000Z.',
})

const wasteReasonSchema: z.ZodType<WasteReason> = z.enum(['expired', 'broken', 'other'], {
  error:
    'El motivo de la merma no es válido. Usa expired (vencido), broken (roto) u other (otro). Corrige el motivo.',
})

export const categoryInputSchema = z.object({
  name: requiredName('El nombre de la categoría', 2, 60),
  expiryAlertDays: nonNegativeInteger('Los días de alerta'),
}) satisfies z.ZodType<CategoryInput>

/** Cambios parciales de categoría: reutiliza las mismas reglas del esquema base. */
export const partialCategoryInputSchema = categoryInputSchema.partial()

export const productInputSchema: z.ZodType<ProductInput> = z.object({
  name: requiredName('El nombre del producto', 2, 120),
  categoryId: requiredId('La categoría'),
  priceCents: nonNegativeCents('El precio'),
  costCents: nonNegativeCents('El costo'),
  minStock: nonNegativeInteger('El stock mínimo'),
  isFavorite: z
    .boolean({
      error: 'El campo favorito debe ser verdadero o falso. Corrige el valor.',
    })
    .default(false),
  active: z
    .boolean({
      error: 'El campo activo debe ser verdadero o falso. Corrige el valor.',
    })
    .default(true),
})

export const receiveLotInputSchema: z.ZodType<ReceiveLotInput> = z.object({
  productId: requiredId('El producto'),
  quantity: positiveInteger('La cantidad recibida'),
  expiryDate: expiryDateSchema,
  unitCostCents: nonNegativeCents('El costo unitario'),
  userId: requiredId('El usuario'),
})

export const registerWasteInputSchema: z.ZodType<RegisterWasteInput> = z.object({
  lotId: requiredId('El lote'),
  quantity: positiveInteger('La cantidad de la merma'),
  reason: wasteReasonSchema,
  userId: requiredId('El usuario'),
})

export const adjustStockInputSchema: z.ZodType<AdjustStockInput> = z.object({
  lotId: requiredId('El lote'),
  delta: nonZeroInteger('El ajuste'),
  reason: adjustmentReason(),
  userId: requiredId('El usuario'),
})

const movementBase = {
  id: requiredId('El identificador del movimiento'),
  productId: requiredId('El producto'),
  lotId: requiredId('El lote'),
  occurredAt: occurredAtSchema,
  userId: requiredId('El usuario'),
}

export const stockMovementInputSchema: z.ZodType<StockMovementInput> = z.discriminatedUnion(
  'type',
  [
    z.object({
      ...movementBase,
      type: z.literal('receipt'),
      quantity: positiveInteger('La cantidad recibida'),
    }),
    z.object({
      ...movementBase,
      type: z.literal('sale'),
      quantity: positiveInteger('La cantidad vendida'),
      saleId: requiredId('La venta'),
    }),
    z.object({
      ...movementBase,
      type: z.literal('waste'),
      quantity: positiveInteger('La cantidad de la merma'),
      reason: wasteReasonSchema,
      lossCents: nonNegativeCents('La pérdida'),
    }),
    z.object({
      ...movementBase,
      type: z.literal('adjustment'),
      delta: nonZeroInteger('El ajuste'),
      reason: adjustmentReason(),
    }),
  ],
)

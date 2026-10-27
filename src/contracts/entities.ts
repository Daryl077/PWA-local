// Entidades del dominio (docs/CONTRATOS.md).
import type { Cents, Id, IsoDate, IsoDateTime } from './common'

export type Role = 'owner' | 'seller'

/** Usuario tal como lo ve la aplicación. Nunca incluye la contraseña ni su hash. */
export type UserInfo = {
  id: Id
  name: string
  role: Role
  active: boolean
}

/** Usuario guardado en el dispositivo. Solo lo usa el módulo auth y el almacenamiento. */
export type UserRecord = UserInfo & { passwordHash: string }

export type Category = {
  id: Id
  name: string
  expiryAlertDays: number
}

export type Product = {
  id: Id
  name: string
  categoryId: Id
  priceCents: Cents
  costCents: Cents
  minStock: number
  isFavorite: boolean
  active: boolean
}

export type Lot = {
  id: Id
  productId: Id
  expiryDate: IsoDate
  unitCostCents: Cents
  receivedAt: IsoDateTime
}

export type WasteReason = 'expired' | 'broken' | 'other'

type MovementBase = {
  id: Id
  productId: Id
  lotId: Id
  occurredAt: IsoDateTime
  userId: Id
}

/** Cada cambio de stock es un movimiento nuevo; no se edita ni se borra. */
export type StockMovement =
  | (MovementBase & { type: 'receipt'; quantity: number })
  | (MovementBase & { type: 'sale'; quantity: number; saleId: Id })
  | (MovementBase & { type: 'waste'; quantity: number; reason: WasteReason; lossCents: Cents })
  | (MovementBase & { type: 'adjustment'; delta: number; reason: string })

export type Payment =
  | { type: 'cash'; receivedCents: Cents; changeCents: Cents }
  | { type: 'qr'; receiptConfirmed: true }

export type SaleLine = {
  productId: Id
  lotId: Id
  quantity: number
  unitPriceCents: Cents
  unitCostCents: Cents
}

export type Sale = {
  id: Id
  cashSessionId: Id
  sellerId: Id
  lines: SaleLine[]
  totalCents: Cents
  payment: Payment
  createdAt: IsoDateTime
}

/** Si differenceCents no es 0, explanation dice por qué falta o sobra dinero. */
export type CashClosing = {
  countedCents: Cents
  expectedCents: Cents
  differenceCents: Cents
  explanation: string
}

export type CashSession = {
  id: Id
  sellerId: Id
  openedAt: IsoDateTime
  openingFloatCents: Cents
  closedAt?: IsoDateTime
  closing?: CashClosing
}

export type CashExpense = {
  id: Id
  cashSessionId: Id
  amountCents: Cents
  description: string
  createdAt: IsoDateTime
}

/** Ajuste interno del dispositivo, por ejemplo una preferencia. */
export type Setting = { id: Id; value: unknown }

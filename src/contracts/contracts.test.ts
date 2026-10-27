import { describe, expect, expectTypeOf, it } from 'vitest'

import type { AppError, Result } from './common'
import type {
  CashSession,
  Payment,
  Role,
  Sale,
  StockMovement,
  UserInfo,
  UserRecord,
} from './entities'
import type {
  Action,
  AuthService,
  BackupService,
  CashService,
  ExpiringLot,
  InventoryService,
  SalesService,
} from './services'
import type { AppendOnlyRepository, Repository, Storage } from './storage'

const error: AppError = {
  code: 'STOCK_INSUFFICIENT',
  what: 'No hay stock suficiente.',
  why: 'Se pidieron 3 botellas y solo quedan 2.',
  how: 'Reduce la cantidad o recibe un lote nuevo.',
}

describe('tipos base', () => {
  it('Result distingue el éxito del error sin lanzar excepciones', () => {
    const success: Result<number> = { ok: true, value: 2 }
    const failure: Result<number> = { ok: false, error }

    expect(success.ok ? success.value : null).toBe(2)
    expect(failure.ok ? null : failure.error.code).toBe('STOCK_INSUFFICIENT')
  })

  it('rechaza un Result incompleto', () => {
    // @ts-expect-error Un Result exitoso siempre trae value.
    const withoutValue: Result<number> = { ok: true }
    // @ts-expect-error Un Result fallido siempre trae error.
    const withoutError: Result<number> = { ok: false }

    expect([withoutValue, withoutError]).toHaveLength(2)
  })
})

describe('entidades del dominio', () => {
  it('solo existen los roles Dueño y Vendedor', () => {
    expectTypeOf<Role>().toEqualTypeOf<'owner' | 'seller'>()
    // @ts-expect-error No hay rol de administrador.
    expectTypeOf<'admin'>().toMatchTypeOf<Role>()
  })

  it('UserInfo no expone el hash de la contraseña', () => {
    expectTypeOf<keyof UserInfo>().toEqualTypeOf<'id' | 'name' | 'role' | 'active'>()
    expectTypeOf<keyof UserRecord>().toEqualTypeOf<
      'id' | 'name' | 'role' | 'active' | 'passwordHash'
    >()
  })

  it('un movimiento de venta exige saleId y se puede distinguir', () => {
    const movement: StockMovement = {
      id: 'mov-1',
      productId: 'prod-1',
      lotId: 'lot-1',
      occurredAt: '2026-10-27T10:00:00.000Z',
      userId: 'user-1',
      type: 'sale',
      quantity: 2,
      saleId: 'sale-1',
    }

    expect(movement.type === 'sale' ? movement.saleId : null).toBe('sale-1')

    // @ts-expect-error Una venta sin saleId no se puede registrar.
    const withoutSaleId: StockMovement = {
      id: 'mov-2',
      productId: 'prod-1',
      lotId: 'lot-1',
      occurredAt: '2026-10-27T10:00:00.000Z',
      userId: 'user-1',
      type: 'sale',
      quantity: 1,
    }

    expect(withoutSaleId.type).toBe('sale')
  })

  it('el cobro por QR solo existe con el comprobante confirmado', () => {
    const payment: Payment = { type: 'qr', receiptConfirmed: true }
    expect(payment.receiptConfirmed).toBe(true)

    // @ts-expect-error El vendedor debe confirmar el comprobante.
    const unconfirmed: Payment = { type: 'qr', receiptConfirmed: false }
    expect(unconfirmed.type).toBe('qr')
  })
})

describe('servicios y almacenamiento', () => {
  it('AuthService expone las acciones permitidas para el usuario actual', () => {
    expectTypeOf<AuthService['can']>().toEqualTypeOf<(action: Action) => boolean>()
    expectTypeOf<Action>().toEqualTypeOf<
      | 'sell'
      | 'view_stock'
      | 'open_own_cash'
      | 'view_costs'
      | 'edit_prices'
      | 'adjust_stock'
      | 'manage_sellers'
      | 'view_reports'
      | 'make_backup'
      | 'receive_lot'
      | 'manage_categories'
      | 'manage_products'
    >()
  })

  it('InventoryService y CashService devuelven los tipos del contrato', () => {
    expectTypeOf<Awaited<ReturnType<InventoryService['listExpiringLots']>>>().toEqualTypeOf<
      ExpiringLot[]
    >()
    expectTypeOf<
      Awaited<ReturnType<CashService['getOpenSession']>>
    >().toEqualTypeOf<CashSession | null>()
    expectTypeOf<Awaited<ReturnType<SalesService['registerSale']>>>().toEqualTypeOf<Result<Sale>>()
    expectTypeOf<Awaited<ReturnType<BackupService['importBackup']>>>().toEqualTypeOf<
      Result<{ restoredTables: number }>
    >()
  })

  it('Repositories usa las entidades reales y los movimientos son inmutables', () => {
    expectTypeOf<Storage['repositories']['users']>().toEqualTypeOf<Repository<UserRecord>>()
    expectTypeOf<Storage['repositories']['sales']>().toEqualTypeOf<AppendOnlyRepository<Sale>>()
    expectTypeOf<Storage['repositories']['stockMovements']>().toEqualTypeOf<
      AppendOnlyRepository<StockMovement>
    >()
  })
})

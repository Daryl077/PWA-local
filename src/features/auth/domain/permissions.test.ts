import { describe, expect, expectTypeOf, it } from 'vitest'

import type { Role } from '../../../contracts/entities'
import type { Action } from '../../../contracts/services'
import { can } from './permissions'

const ALL_ACTIONS: readonly Action[] = [
  'sell',
  'view_stock',
  'open_own_cash',
  'view_costs',
  'edit_prices',
  'adjust_stock',
  'manage_sellers',
  'view_reports',
  'make_backup',
  'receive_lot',
  'manage_categories',
  'manage_products',
]

const SELLER_ACTIONS: readonly Action[] = ['sell', 'view_stock', 'open_own_cash']

describe('can', () => {
  it('el Vendedor solo vende, consulta stock y abre su propia caja (RF-SEG-02)', () => {
    for (const action of ALL_ACTIONS) {
      expect(can('seller', action), `Vendedor / ${action}`).toBe(SELLER_ACTIONS.includes(action))
    }
  })

  it('el Dueño puede todas las acciones (RF-SEG-04)', () => {
    for (const action of ALL_ACTIONS) {
      expect(can('owner', action), `Dueño / ${action}`).toBe(true)
    }
  })

  it('el Vendedor no puede ver costos ni administrar usuarios (RF-SEG-02)', () => {
    expect(can('seller', 'view_costs')).toBe(false)
    expect(can('seller', 'manage_sellers')).toBe(false)
    expect(can('seller', 'view_reports')).toBe(false)
  })

  it('niega acciones desconocidas en tiempo de ejecución', () => {
    const unknownAction = 'delete_everything' as Action

    expect(can('owner', unknownAction)).toBe(false)
  })

  it('solo acepta los roles y acciones del contrato', () => {
    expectTypeOf(can).toEqualTypeOf<(role: Role, action: Action) => boolean>()

    const withUnknownRole = () => {
      // @ts-expect-error No existe un rol 'admin'.
      can('admin', 'sell')
    }
    const withUnknownAction = () => {
      // @ts-expect-error No existe una acción 'delete_everything'.
      can('seller', 'delete_everything')
    }

    expect([withUnknownRole, withUnknownAction]).toHaveLength(2)
  })
})

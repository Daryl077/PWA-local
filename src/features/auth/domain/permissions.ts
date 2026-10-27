import type { Role } from '../../../contracts/entities'
import type { Action } from '../../../contracts/services'

/**
 * Permisos por acción. El Dueño puede todo; el Vendedor solo vende, consulta
 * existencias y abre la caja de su turno (RF-SEG-02).
 */
const rolesByAction: Record<Action, readonly Role[]> = {
  sell: ['owner', 'seller'],
  view_stock: ['owner', 'seller'],
  open_own_cash: ['owner', 'seller'],
  view_costs: ['owner'],
  edit_prices: ['owner'],
  adjust_stock: ['owner'],
  manage_sellers: ['owner'],
  view_reports: ['owner'],
  make_backup: ['owner'],
  receive_lot: ['owner'],
  manage_categories: ['owner'],
  manage_products: ['owner'],
}

/** Indica si el rol puede hacer la acción (RF-SEG-02 y RF-SEG-04). */
export function can(role: Role, action: Action): boolean {
  const allowedRoles: readonly Role[] | undefined = rolesByAction[action]

  return allowedRoles?.includes(role) ?? false
}

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AppError } from '../../../contracts/common'
import type { Lot, Product, StockMovement, UserInfo } from '../../../contracts/entities'
import type { Action, AuthService, InventoryService } from '../../../contracts/services'
import { LotScreen } from './LotScreen'

const OWNER: UserInfo = { id: 'owner-1', name: 'Ana', role: 'owner', active: true }
const SELLER: UserInfo = { id: 'seller-1', name: 'Luis', role: 'seller', active: true }

const PRODUCT: Product = {
  id: 'prod-1',
  name: 'Cerveza 620 ml',
  categoryId: 'cat-1',
  priceCents: 1500,
  costCents: 800,
  minStock: 5,
  isFavorite: false,
  active: true,
}

const LOT: Lot = {
  id: 'lot-1',
  productId: PRODUCT.id,
  expiryDate: '2026-12-10',
  unitCostCents: 800,
  receivedAt: '2026-11-01T10:00:00.000Z',
}

const NEW_LOT: Lot = {
  id: 'lot-new',
  productId: PRODUCT.id,
  expiryDate: '2026-12-20',
  unitCostCents: 1250,
  receivedAt: '2026-11-20T12:00:00.000Z',
}

const WASTE: StockMovement = {
  type: 'waste',
  id: 'movement-waste',
  productId: PRODUCT.id,
  lotId: LOT.id,
  occurredAt: '2026-11-20T12:00:00.000Z',
  userId: OWNER.id,
  quantity: 2,
  reason: 'expired',
  lossCents: 1600,
}

const ADJUSTMENT: StockMovement = {
  type: 'adjustment',
  id: 'movement-adjustment',
  productId: PRODUCT.id,
  lotId: LOT.id,
  occurredAt: '2026-11-20T12:00:00.000Z',
  userId: OWNER.id,
  delta: -2,
  reason: 'Conteo físico',
}

const SERVICE_ERROR: AppError = {
  code: 'INSUFFICIENT_STOCK',
  what: 'No se pudo registrar la merma.',
  why: 'Solo quedan 1 unidades en el lote y quieres dar de baja 2.',
  how: 'Revisa el stock del lote o pide un ajuste al dueño.',
}

type TestAuth = Pick<AuthService, 'can' | 'currentUser'>

function createAuth(user: UserInfo, actions: Action[]): TestAuth {
  return {
    currentUser: () => user,
    can: (action) => actions.includes(action),
  }
}

function createInventory(overrides: Partial<InventoryService> = {}): InventoryService {
  const inventory: InventoryService = {
    getStock: async () => 5,
    allocateForSale: async () => ({ ok: true, value: [] }),
    listExpiringLots: async () => [],
    registerWaste: async () => ({ ok: true, value: WASTE }),
    receiveLot: async () => ({ ok: true, value: NEW_LOT }),
    adjustStock: async () => ({ ok: true, value: ADJUSTMENT }),
  }

  return { ...inventory, ...overrides }
}

function renderScreen(options: {
  auth?: TestAuth
  inventoryService?: InventoryService
  loadsLots?: Lot[]
  loadLots?: (productId: string) => Promise<Lot[]>
} = {}) {
  const loadLots = options.loadLots ?? vi.fn(async () => options.loadsLots ?? [LOT])

  render(
    <LotScreen
      inventoryService={options.inventoryService ?? createInventory()}
      auth={options.auth ?? createAuth(OWNER, ['receive_lot', 'adjust_stock', 'registerwaste', 'view_costs'])}
      products={[PRODUCT]}
      today="2026-11-20"
      loadLots={loadLots}
    />,
  )

  return { loadLots }
}

describe('LotScreen', () => {
  it('carga stock, lotes y próximos vencimientos del producto (RF-INV-02, RF-INV-04)', async () => {
    const getStock = vi.fn(async () => 5)
    const listExpiringLots = vi.fn(async () => [
      { lot: LOT, daysLeft: 20, productName: PRODUCT.name },
    ])
    const inventoryService = createInventory({ getStock, listExpiringLots })
    const { loadLots } = renderScreen({ inventoryService })

    expect(await screen.findByText('Stock disponible: 5 unidades')).toBeInTheDocument()
    expect(screen.getByText(/10\/12\/2026/)).toBeInTheDocument()
    expect(screen.getByText('Por vencer')).toBeInTheDocument()
    expect(loadLots).toHaveBeenCalledWith(PRODUCT.id)
    expect(getStock).toHaveBeenCalledWith(PRODUCT.id, '2026-11-20')
    expect(listExpiringLots).toHaveBeenCalledWith('2026-11-20')
  })

  it('el Dueño ve el ingreso, la merma y el ajuste', async () => {
    renderScreen()

    expect(await screen.findByRole('button', { name: 'Registrar ingreso' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Merma/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ajuste/ })).toBeInTheDocument()
    expect(screen.getByText('Costo unitario: Bs 8,00')).toBeInTheDocument()
  })

  it('el Vendedor consulta stock y lotes, sin ingresos, mermas, ajustes ni costos', async () => {
    renderScreen({ auth: createAuth(SELLER, ['view_stock']) })

    expect(await screen.findByText('Stock disponible: 5 unidades')).toBeInTheDocument()
    expect(screen.getByText(/10\/12\/2026/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar ingreso' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Merma/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ajuste/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Costo unitario/)).not.toBeInTheDocument()
  })

  it('registra el ingreso con el usuario actual (RF-INV-03)', async () => {
    const receiveLot = vi.fn(async () => ({ ok: true as const, value: NEW_LOT }))
    renderScreen({ inventoryService: createInventory({ receiveLot }) })

    fireEvent.change(await screen.findByLabelText('Cantidad'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Fecha de vencimiento'), {
      target: { value: '2026-12-20' },
    })
    fireEvent.change(screen.getByLabelText('Costo unitario (Bs)'), {
      target: { value: '12,50' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(await screen.findByText('Ingreso registrado.')).toBeInTheDocument()
    expect(receiveLot).toHaveBeenCalledWith({
      productId: PRODUCT.id,
      quantity: 3,
      expiryDate: '2026-12-20',
      unitCostCents: 1250,
      userId: OWNER.id,
    })
    expect(screen.getByText(/20\/12\/2026/)).toBeInTheDocument()
  })

  it('registra una merma con motivo (RF-INV-05)', async () => {
    const registerWaste = vi.fn(async () => ({ ok: true as const, value: WASTE }))
    renderScreen({ inventoryService: createInventory({ registerWaste }) })

    fireEvent.click(await screen.findByRole('button', { name: /Merma/ }))
    expect(screen.getByRole('heading', { name: 'Registrar merma' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Cantidad de la merma'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'expired' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar merma' }))

    expect(registerWaste).toHaveBeenCalledWith({
      lotId: LOT.id,
      quantity: 2,
      reason: 'expired',
      userId: OWNER.id,
    })
    expect(
      await screen.findByRole('button', { name: 'Registrar ingreso' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Registrar merma' })).not.toBeInTheDocument()
  })

  it('muestra el AppError cuando la merma supera el stock del lote', async () => {
    const registerWaste = vi.fn(async () => ({ ok: false as const, error: SERVICE_ERROR }))
    renderScreen({ inventoryService: createInventory({ registerWaste }) })

    fireEvent.click(await screen.findByRole('button', { name: /Merma/ }))
    fireEvent.change(screen.getByLabelText('Cantidad de la merma'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar merma' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Solo quedan 1 unidades en el lote y quieres dar de baja 2.',
    )
  })

  it('registra un ajuste de stock (RF-INV-05)', async () => {
    const adjustStock = vi.fn(async () => ({ ok: true as const, value: ADJUSTMENT }))
    renderScreen({ inventoryService: createInventory({ adjustStock }) })

    fireEvent.click(await screen.findByRole('button', { name: /Ajuste/ }))
    expect(screen.getByRole('heading', { name: 'Ajustar lote' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Cambio de unidades'), { target: { value: '-2' } })
    fireEvent.change(screen.getByLabelText('Motivo del ajuste'), {
      target: { value: 'Conteo físico' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ajuste' }))

    expect(adjustStock).toHaveBeenCalledWith({
      lotId: LOT.id,
      delta: -2,
      reason: 'Conteo físico',
      userId: OWNER.id,
    })
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Ajustar lote' })).not.toBeInTheDocument(),
    )
  })

  it('muestra estado vacío cuando el producto no tiene lotes', async () => {
    renderScreen({ loadsLots: [] })

    expect(await screen.findByText('Este producto todavía no tiene lotes.')).toBeInTheDocument()
  })

  it('muestra un error si el servicio no puede cargar el inventario', async () => {
    const inventoryService = createInventory({
      getStock: async () => {
        throw new Error('falló IndexedDB')
      },
    })
    renderScreen({ inventoryService })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el inventario.')
  })
})

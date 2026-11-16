import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Lot } from '../../../contracts/entities'
import { LotList } from './LotList'

const NORMAL_LOT: Lot = {
  id: 'lot-normal',
  productId: 'prod-1',
  expiryDate: '2027-03-01',
  unitCostCents: 800,
  receivedAt: '2026-11-20T12:00:00.000Z',
}

const EXPIRING_LOT: Lot = {
  id: 'lot-expiring',
  productId: 'prod-1',
  expiryDate: '2026-12-10',
  unitCostCents: 900,
  receivedAt: '2026-11-20T12:00:00.000Z',
}

const EXPIRED_LOT: Lot = {
  id: 'lot-expired',
  productId: 'prod-1',
  expiryDate: '2026-11-15',
  unitCostCents: 700,
  receivedAt: '2026-10-01T12:00:00.000Z',
}

function renderList(options: {
  lots?: Lot[]
  showCosts?: boolean
  canWaste?: boolean
  canAdjust?: boolean
  onWaste?: (lot: Lot) => void
  onAdjust?: (lot: Lot) => void
}) {
  return render(
    <LotList
      lots={options.lots ?? [NORMAL_LOT, EXPIRING_LOT, EXPIRED_LOT]}
      today="2026-11-20"
      expiringLotIds={new Set([EXPIRING_LOT.id])}
      showCosts={options.showCosts ?? true}
      canWaste={options.canWaste ?? true}
      canAdjust={options.canAdjust ?? true}
      onWaste={options.onWaste ?? vi.fn()}
      onAdjust={options.onAdjust ?? vi.fn()}
    />,
  )
}

describe('LotList', () => {
  it('muestra los lotes con vencimiento, costo y estado', () => {
    renderList({})

    expect(screen.getByText(/10\/12\/2026/)).toBeInTheDocument()
    expect(screen.getByText('Por vencer')).toBeInTheDocument()
    expect(screen.getByText('Vencido')).toBeInTheDocument()
    expect(screen.getByText('Costo unitario: Bs 9,00')).toBeInTheDocument()
  })

  it('ordena los lotes por vencimiento más próximo', () => {
    renderList({})

    const heading = screen.getByRole('heading', { name: 'Lotes del producto' })
    const text = heading.parentElement?.textContent ?? ''

    expect(text.indexOf('15/11/2026')).toBeLessThan(text.indexOf('10/12/2026'))
    expect(text.indexOf('10/12/2026')).toBeLessThan(text.indexOf('01/03/2027'))
  })

  it('oculta costos y acciones al Vendedor', () => {
    renderList({ showCosts: false, canWaste: false, canAdjust: false })

    expect(screen.queryByText(/Costo unitario/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Merma/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ajuste/ })).not.toBeInTheDocument()
  })

  it('avisa cuando el producto todavía no tiene lotes', () => {
    renderList({ lots: [] })

    expect(screen.getByText('Este producto todavía no tiene lotes.')).toBeInTheDocument()
  })

  it('pide la merma o el ajuste del lote elegido', () => {
    const onWaste = vi.fn()
    const onAdjust = vi.fn()
    renderList({ lots: [EXPIRING_LOT], onWaste, onAdjust })

    fireEvent.click(screen.getByRole('button', { name: 'Merma del lote que vence el 10/12/2026' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Ajuste del lote que vence el 10/12/2026' }),
    )

    expect(onWaste).toHaveBeenCalledWith(EXPIRING_LOT)
    expect(onAdjust).toHaveBeenCalledWith(EXPIRING_LOT)
  })
})

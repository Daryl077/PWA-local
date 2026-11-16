import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AppError, Result } from '../../../contracts/common'
import type { Lot, Product } from '../../../contracts/entities'
import { LotForm } from './LotForm'

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
  unitCostCents: 1250,
  receivedAt: '2026-11-20T12:00:00.000Z',
}

const SERVICE_ERROR: AppError = {
  code: 'INVALID_LOT',
  what: 'No se pudo registrar el lote.',
  why: 'La fecha de vencimiento no es válida.',
  how: 'Revisa la fecha y vuelve a intentarlo.',
}

function fillForm(values: { quantity?: string; expiryDate?: string; cost?: string } = {}) {
  fireEvent.change(screen.getByLabelText('Cantidad'), {
    target: { value: values.quantity ?? '3' },
  })
  fireEvent.change(screen.getByLabelText('Fecha de vencimiento'), {
    target: { value: values.expiryDate ?? '2026-12-10' },
  })
  fireEvent.change(screen.getByLabelText('Costo unitario (Bs)'), {
    target: { value: values.cost ?? '12,50' },
  })
}

describe('LotForm', () => {
  it('registra un ingreso con producto, cantidad, vencimiento y costo en centavos', async () => {
    const onSubmit = vi.fn(async (): Promise<Result<Lot>> => ({ ok: true, value: LOT }))
    render(<LotForm products={[PRODUCT]} onSubmit={onSubmit} />)

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(await screen.findByText('Ingreso registrado.')).toBeInTheDocument()
    expect(onSubmit).toHaveBeenCalledWith({
      productId: PRODUCT.id,
      quantity: 3,
      expiryDate: '2026-12-10',
      unitCostCents: 1250,
    })
  })

  it('no llama al servicio si la cantidad o el costo no son válidos', async () => {
    const onSubmit = vi.fn(async (): Promise<Result<Lot>> => ({ ok: true, value: LOT }))
    render(<LotForm products={[PRODUCT]} onSubmit={onSubmit} />)

    fillForm({ quantity: '0', cost: 'abc' })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escribe una cantidad entera mayor que cero.',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('muestra el AppError que devuelve el servicio', async () => {
    const onSubmit = vi.fn(async (): Promise<Result<Lot>> => ({
      ok: false,
      error: SERVICE_ERROR,
    }))
    render(<LotForm products={[PRODUCT]} onSubmit={onSubmit} />)

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La fecha de vencimiento no es válida.',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa la fecha y vuelve a intentarlo.')
  })

  it('tiene etiquetas accesibles para todos los campos', () => {
    render(<LotForm products={[PRODUCT]} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Producto')).toBeInTheDocument()
    expect(screen.getByLabelText('Cantidad')).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha de vencimiento')).toBeInTheDocument()
    expect(screen.getByLabelText('Costo unitario (Bs)')).toBeInTheDocument()
  })
})

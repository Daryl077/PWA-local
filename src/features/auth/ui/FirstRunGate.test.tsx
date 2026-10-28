import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AppError, Result } from '../../../contracts/common'
import type { UserInfo } from '../../../contracts/entities'
import type { FirstRunInput } from '../domain/first-run'
import { FirstRunGate } from './FirstRunGate'

const owner: UserInfo = { id: 'user-1', name: 'Ana', role: 'owner', active: true }

const invalidInput: AppError = {
  code: 'INVALID_OWNER_INPUT',
  what: 'No se pudo crear el Dueño.',
  why: 'La contraseña debe tener al menos 8 caracteres.',
  how: 'Revisa tu nombre y tu contraseña, y vuelve a intentarlo.',
}

function renderGate(
  hasOwner: () => Promise<boolean>,
  createOwner: (input: FirstRunInput) => Promise<Result<UserInfo>>,
) {
  return render(
    <FirstRunGate hasOwner={hasOwner} createOwner={createOwner}>
      <p>Punto de venta</p>
    </FirstRunGate>,
  )
}

function fillForm() {
  fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-segura' } })
  fireEvent.click(screen.getByRole('button', { name: 'Crear Dueño' }))
}

describe('FirstRunGate', () => {
  it('muestra el formulario la primera vez y abre la app al crear al Dueño', async () => {
    const createOwner = vi.fn(async (): Promise<Result<UserInfo>> => ({ ok: true, value: owner }))
    renderGate(async () => false, createOwner)

    expect(await screen.findByRole('heading', { name: 'Primer uso' })).toBeInTheDocument()
    fillForm()

    expect(await screen.findByText('Punto de venta')).toBeInTheDocument()
    expect(createOwner).toHaveBeenCalledWith({ name: 'Ana', password: 'clave-segura' })
  })

  it('muestra el error y no abre la app si los datos no son válidos', async () => {
    const createOwner = vi.fn(async (): Promise<Result<UserInfo>> => ({
      ok: false,
      error: invalidInput,
    }))
    renderGate(async () => false, createOwner)

    await screen.findByRole('heading', { name: 'Primer uso' })
    fillForm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La contraseña debe tener al menos 8 caracteres.',
    )
    expect(screen.getByRole('heading', { name: 'Primer uso' })).toBeInTheDocument()
    expect(screen.queryByText('Punto de venta')).not.toBeInTheDocument()
  })

  it('abre la app directamente si el Dueño ya existe', async () => {
    renderGate(async () => true, vi.fn())

    expect(await screen.findByText('Punto de venta')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Primer uso' })).not.toBeInTheDocument()
  })
})

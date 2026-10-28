import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { Result } from '../../../contracts/common'
import type { UserInfo } from '../../../contracts/entities'
import { LockOverlay } from './LockOverlay'

const user: UserInfo = { id: 'u-1', name: 'Ana', role: 'owner', active: true }

const lockedError: Result<UserInfo> = {
  ok: false,
  error: {
    code: 'INVALID_PASSWORD',
    what: 'No se pudo desbloquear la pantalla.',
    why: 'La contraseña no es correcta.',
    how: 'Escríbela otra vez.',
  },
}

describe('LockOverlay', () => {
  it('pide la contraseña del usuario actual', () => {
    render(<LockOverlay userName="Ana" onUnlock={vi.fn()} onLogout={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Pantalla bloqueada' })).toBeInTheDocument()
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
  })

  it('desbloquea con la contraseña correcta', async () => {
    const onUnlock = vi.fn().mockResolvedValue({ ok: true, value: user } satisfies Result<UserInfo>)
    render(<LockOverlay userName="Ana" onUnlock={onUnlock} onLogout={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-segura' } })
    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))

    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith('clave-segura'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra el error y sigue bloqueada si la contraseña es incorrecta', async () => {
    const onUnlock = vi.fn().mockResolvedValue(lockedError)
    render(<LockOverlay userName="Ana" onUnlock={onUnlock} onLogout={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'incorrecta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña no es correcta.')
    expect(screen.getByRole('dialog', { name: 'Pantalla bloqueada' })).toBeInTheDocument()
  })

  it('permite cerrar la sesión si no recuerda la contraseña', () => {
    const onLogout = vi.fn()
    render(<LockOverlay userName="Ana" onUnlock={vi.fn()} onLogout={onLogout} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(onLogout).toHaveBeenCalledOnce()
  })
})

// @vitest-environment jsdom
// jsdom no trae crypto.subtle; se usa el Web Crypto de Node para PBKDF2.
import 'fake-indexeddb/auto'
import { webcrypto } from 'node:crypto'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppRoot } from './app-root'
import type { Role } from './contracts/entities'
import { AuthServiceImpl, hashPassword } from './features/auth'
import { StorageImpl } from './storage/storage'

beforeAll(() => {
  vi.stubGlobal('crypto', webcrypto)
})

let storage: StorageImpl

beforeEach(async () => {
  storage = new StorageImpl()
  await storage.db.open()
  await storage.db.users.clear()
})

afterEach(() => {
  storage.db.close()
})

async function seedUser(name: string, role: Role, password: string) {
  await storage.repositories.users.put({
    id: globalThis.crypto.randomUUID(),
    name,
    role,
    active: true,
    passwordHash: await hashPassword(password),
  })
}

function renderApp() {
  return render(<AppRoot storage={storage} auth={new AuthServiceImpl(storage)} />)
}

function submitLogin(name: string, password: string) {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('flujo de autenticación de la app', () => {
  it('recorre primer uso, login, bloqueo, desbloqueo y cierre de sesión (RF-SEG-01, RNF-PLA-09)', async () => {
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Primer uso' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-segura' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear Dueño' }))

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    submitLogin('Ana', 'clave-segura')

    expect(await screen.findByRole('heading', { name: 'Punto de venta' })).toBeInTheDocument()
    expect(screen.getByText(/Ana · Dueño/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }))
    expect(await screen.findByRole('dialog', { name: 'Pantalla bloqueada' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Punto de venta' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'incorrecta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña no es correcta.')

    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-segura' } })
    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))

    expect(await screen.findByRole('heading', { name: 'Punto de venta' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  }, 30_000)

  it('el Vendedor entra pero no ve Reportes ni acciones del Dueño (RF-SEG-02)', async () => {
    await seedUser('Ana', 'owner', 'clave-segura')
    await seedUser('Beto', 'seller', 'clave-vendedor')
    renderApp()

    await screen.findByRole('heading', { name: 'Iniciar sesión' })
    submitLogin('Beto', 'clave-vendedor')

    expect(await screen.findByRole('heading', { name: 'Punto de venta' })).toBeInTheDocument()
    expect(screen.getByText(/Beto · Vendedor/)).toBeInTheDocument()
    expect(screen.queryAllByRole('link', { name: 'Reportes' })).toHaveLength(0)
    expect(screen.getAllByRole('link', { name: 'Venta' }).length).toBeGreaterThan(0)
  }, 30_000)
})

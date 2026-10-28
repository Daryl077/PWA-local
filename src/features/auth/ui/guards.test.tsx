import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { UserInfo } from '../../../contracts/entities'
import type { Action } from '../../../contracts/services'
import { can } from '../domain/permissions'
import { RoleGuard, RouteGuard } from './guards'

const user: UserInfo = { id: 'u-1', name: 'Ana', role: 'owner', active: true }

function canAs(role: UserInfo['role']) {
  return (action: Action) => can(role, action)
}

describe('RouteGuard', () => {
  it('muestra la pantalla cuando hay sesión y no está bloqueada', () => {
    render(
      <RouteGuard user={user} isLocked={false}>
        <p>Pantalla de ventas</p>
      </RouteGuard>,
    )

    expect(screen.getByText('Pantalla de ventas')).toBeInTheDocument()
  })

  it('no muestra la pantalla sin sesión (RF-SEG-01)', () => {
    render(
      <RouteGuard user={null}>
        <p>Pantalla de ventas</p>
      </RouteGuard>,
    )

    expect(screen.queryByText('Pantalla de ventas')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Inicia sesión para continuar.')
  })

  it('no muestra la pantalla mientras está bloqueada (RNF-PLA-09)', () => {
    render(
      <RouteGuard user={user} isLocked>
        <p>Pantalla de ventas</p>
      </RouteGuard>,
    )

    expect(screen.queryByText('Pantalla de ventas')).not.toBeInTheDocument()
  })

  it('usa el contenido alternativo que recibe', () => {
    render(
      <RouteGuard user={null} fallback={<p>Entra con tu usuario</p>}>
        <p>Pantalla de ventas</p>
      </RouteGuard>,
    )

    expect(screen.getByText('Entra con tu usuario')).toBeInTheDocument()
  })
})

describe('RoleGuard', () => {
  it('deja pasar al Dueño a administrar vendedores (RF-SEG-04)', () => {
    render(
      <RoleGuard can={canAs('owner')} action="manage_sellers">
        <p>Vendedores</p>
      </RoleGuard>,
    )

    expect(screen.getByText('Vendedores')).toBeInTheDocument()
  })

  it('no deja ver costos al Vendedor (RF-SEG-02)', () => {
    render(
      <RoleGuard can={canAs('seller')} action="view_costs">
        <p>Costos y márgenes</p>
      </RoleGuard>,
    )

    expect(screen.queryByText('Costos y márgenes')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('No tienes permiso')
  })

  it('deja vender al Vendedor (RF-SEG-02)', () => {
    render(
      <RoleGuard can={canAs('seller')} action="sell">
        <p>Nueva venta</p>
      </RoleGuard>,
    )

    expect(screen.getByText('Nueva venta')).toBeInTheDocument()
  })
})

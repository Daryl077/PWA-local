import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './app'

const destinations = ['Venta', 'Inventario', 'Caja', 'Reportes']

describe('App', () => {
  it('muestra la pantalla principal', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Punto de venta' })).toBeInTheDocument()
  })

  it('ofrece los mismos destinos en la navegación inferior y en la lateral', () => {
    render(<App />)

    const bottomNavigation = screen.getByRole('navigation', { name: 'Navegación inferior' })
    const sideNavigation = screen.getByRole('navigation', { name: 'Navegación lateral' })

    for (const destination of destinations) {
      expect(within(bottomNavigation).getByRole('link', { name: destination })).toBeInTheDocument()
      expect(within(sideNavigation).getByRole('link', { name: destination })).toBeInTheDocument()
    }
  })
})

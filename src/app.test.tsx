import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './app'

describe('App', () => {
  it('muestra el nombre de la licorería', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Licorería' })).toBeInTheDocument()
  })
})

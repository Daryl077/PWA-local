import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SystemStatus from './SystemStatus'

describe('SystemStatus', () => {
  const mockEstimate = (persisted: boolean, quota: number) => {
    return {
      persisted,
      usage: quota * 0.1,
      quota,
    }
  }

  it('muestra el estado cuando el almacenamiento es persistente', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persist: vi.fn().mockResolvedValue(true),
        estimate: vi.fn().mockResolvedValue(mockEstimate(true, 100 * 1024 * 1024)),
      },
    } as unknown as Navigator)

    render(<SystemStatus />)
    
    const label = await screen.findByText(/Almacenamiento persistente:/i)
    expect(label).toBeInTheDocument()
    
    const value = screen.getByText('Sí')
    expect(value).toBeInTheDocument()

    expect(screen.getByText(/Espacio usado:/i)).toBeInTheDocument()
    expect(screen.getByText(/10 MB/i)).toBeInTheDocument()
  })

  it('muestra el estado cuando el almacenamiento NO es persistente', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persist: vi.fn().mockResolvedValue(false),
        estimate: vi.fn().mockResolvedValue(mockEstimate(false, 100 * 1024 * 1024)),
      },
    } as unknown as Navigator)

    render(<SystemStatus />)
    
    const label = await screen.findByText(/Almacenamiento persistente:/i)
    expect(label).toBeInTheDocument()
    
    const value = screen.getByText('No')
    expect(value).toBeInTheDocument()

    expect(screen.getByText(/Espacio usado:/i)).toBeInTheDocument()
    expect(screen.getByText(/10 MB/i)).toBeInTheDocument()
  })
})

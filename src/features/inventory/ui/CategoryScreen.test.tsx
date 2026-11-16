import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { AppError } from '../../../contracts/common'
import type { Category, Product } from '../../../contracts/entities'
import type { Action, AuthService } from '../../../contracts/services'
import { StorageImpl } from '../../../storage/storage'
import { InventoryServiceImpl } from '../domain/inventoryService'
import { CategoryScreen, type CategoryInventoryService } from './CategoryScreen'

const unavailableError: AppError = {
  code: 'ACCOUNT_UNAVAILABLE',
  what: 'La cuenta no está disponible.',
  why: 'El servicio de autenticación no se usó en esta prueba.',
  how: 'Vuelve a intentar desde la pantalla de inicio de sesión.',
}

function createAuth(canManageCategories: boolean): AuthService {
  return {
    currentUser: () => null,
    login: async () => ({ ok: false, error: unavailableError }),
    logout: () => {},
    lock: () => {},
    can: (action: Action) => canManageCategories && action === 'manage_categories',
    createSeller: async () => ({ ok: false, error: unavailableError }),
    setSellerActive: async () => ({ ok: false, error: unavailableError }),
    listSellers: async () => [],
  }
}

function createService(
  overrides: Partial<CategoryInventoryService> = {},
): CategoryInventoryService {
  return {
    listCategories: async () => [],
    createCategory: async () => ({ ok: false, error: unavailableError }),
    updateCategory: async () => ({ ok: false, error: unavailableError }),
    deleteCategory: async () => ({ ok: false, error: unavailableError }),
    ...overrides,
  }
}

function makeCategory(name: string, expiryAlertDays: number): Category {
  return { id: crypto.randomUUID(), name, expiryAlertDays }
}

function makeProduct(categoryId: string): Product {
  return {
    id: crypto.randomUUID(),
    name: 'Cerveza 620 ml',
    categoryId,
    priceCents: 1500,
    costCents: 900,
    minStock: 6,
    isFavorite: false,
    active: true,
  }
}

let storage: StorageImpl
let ownerAuth: AuthService
let sellerAuth: AuthService

beforeEach(async () => {
  storage = new StorageImpl()
  await storage.db.open()
  await storage.db.categories.clear()
  await storage.db.products.clear()
  ownerAuth = createAuth(true)
  sellerAuth = createAuth(false)
})

describe('CategoryScreen', () => {
  it('muestra las categorías que devuelve el servicio', async () => {
    await storage.repositories.categories.put(makeCategory('Cervezas', 30))
    await storage.repositories.categories.put(makeCategory('Vinos', 60))

    render(
      <CategoryScreen
        inventoryService={new InventoryServiceImpl(storage, ownerAuth)}
        auth={ownerAuth}
      />,
    )

    expect(await screen.findByText('Cervezas')).toBeInTheDocument()
    expect(screen.getByText('Vinos')).toBeInTheDocument()
  })

  it('agrega una categoría válida a la lista', async () => {
    render(
      <CategoryScreen
        inventoryService={new InventoryServiceImpl(storage, ownerAuth)}
        auth={ownerAuth}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva categoría' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Licores' } })
    fireEvent.change(screen.getByLabelText('Días de alerta'), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar categoría' }))

    expect(await screen.findByText('Licores')).toBeInTheDocument()
    expect(await storage.repositories.categories.list()).toHaveLength(1)
  })

  it('muestra el mensaje de un nombre demasiado corto y no guarda', async () => {
    render(
      <CategoryScreen
        inventoryService={new InventoryServiceImpl(storage, ownerAuth)}
        auth={ownerAuth}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva categoría' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText('Días de alerta'), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar categoría' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('demasiado corto')
    expect(await storage.repositories.categories.list()).toHaveLength(0)
  })

  it('muestra INVENTORY_CATEGORY_NAME_TAKEN para un nombre duplicado', async () => {
    await storage.repositories.categories.put(makeCategory('Cervezas', 30))

    render(
      <CategoryScreen
        inventoryService={new InventoryServiceImpl(storage, ownerAuth)}
        auth={ownerAuth}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva categoría' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: '  cervezas  ' } })
    fireEvent.change(screen.getByLabelText('Días de alerta'), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar categoría' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('nombre ya está en uso')
    expect(alert).toHaveAttribute('data-code', 'INVENTORY_CATEGORY_NAME_TAKEN')
  })

  it('edita solo los días de alerta y conserva el nombre y el id', async () => {
    const category = makeCategory('Cervezas', 30)
    await storage.repositories.categories.put(category)

    render(
      <CategoryScreen
        inventoryService={new InventoryServiceImpl(storage, ownerAuth)}
        auth={ownerAuth}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Editar Cervezas' }))
    fireEvent.change(screen.getByLabelText('Días de alerta'), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('45 días de alerta')).toBeInTheDocument()
    await expect(storage.repositories.categories.get(category.id)).resolves.toEqual({
      ...category,
      expiryAlertDays: 45,
    })
  })

  it('edita solo el nombre y conserva los días de alerta', async () => {
    const category = makeCategory('Cervezas', 30)
    await storage.repositories.categories.put(category)

    render(
      <CategoryScreen
        inventoryService={new InventoryServiceImpl(storage, ownerAuth)}
        auth={ownerAuth}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Editar Cervezas' }))
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: '  Cervezas artesanales  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Cervezas artesanales')).toBeInTheDocument()
    await expect(storage.repositories.categories.get(category.id)).resolves.toEqual({
      ...category,
      name: 'Cervezas artesanales',
    })
  })

  it('elimina una categoría sin productos', async () => {
    await storage.repositories.categories.put(makeCategory('Cervezas', 30))

    render(
      <CategoryScreen
        inventoryService={new InventoryServiceImpl(storage, ownerAuth)}
        auth={ownerAuth}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar Cervezas' }))

    await waitFor(() => {
      expect(screen.queryByText('Cervezas')).not.toBeInTheDocument()
    })
    await expect(storage.repositories.categories.list()).resolves.toEqual([])
  })

  it('muestra INVENTORY_CATEGORY_HAS_PRODUCTS y no elimina una categoría con productos', async () => {
    const category = makeCategory('Cervezas', 30)
    await storage.repositories.categories.put(category)
    await storage.repositories.products.put(makeProduct(category.id))

    render(
      <CategoryScreen
        inventoryService={new InventoryServiceImpl(storage, ownerAuth)}
        auth={ownerAuth}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar Cervezas' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('productos asociados')
    expect(alert).toHaveAttribute('data-code', 'INVENTORY_CATEGORY_HAS_PRODUCTS')
    expect(screen.getByText('Cervezas')).toBeInTheDocument()
  })

  it('oculta las acciones de gestión al Vendedor', async () => {
    await storage.repositories.categories.put(makeCategory('Cervezas', 30))

    render(
      <CategoryScreen
        inventoryService={new InventoryServiceImpl(storage, sellerAuth)}
        auth={sellerAuth}
      />,
    )

    expect(await screen.findByText('Cervezas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nueva categoría' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar Cervezas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar Cervezas' })).not.toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay categorías', async () => {
    render(
      <CategoryScreen
        inventoryService={new InventoryServiceImpl(storage, ownerAuth)}
        auth={ownerAuth}
      />,
    )

    expect(await screen.findByText(/Todavía no hay categorías/)).toBeInTheDocument()
  })

  it('muestra el estado de carga', () => {
    const service = createService({ listCategories: () => new Promise(() => {}) })

    render(<CategoryScreen inventoryService={service} auth={ownerAuth} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando categorías')
  })

  it('muestra un error cuando falla la carga', async () => {
    const service = createService({
      listCategories: async () => {
        throw new Error('falló la lectura')
      },
    })

    render(<CategoryScreen inventoryService={service} auth={ownerAuth} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las categorías',
    )
  })
})

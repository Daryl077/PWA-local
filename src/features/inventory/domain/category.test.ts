import { describe, expect, it } from 'vitest'

import type { Category, Product } from '../../../contracts/entities'
import type { CategoryInput } from './schemas'
import { canDeleteCategory, createCategory, updateCategory } from './category'

const category: Category = {
  id: 'category-1',
  name: 'Cervezas',
  expiryAlertDays: 30,
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Cerveza 620 ml',
    categoryId: 'category-1',
    priceCents: 1500,
    costCents: 900,
    minStock: 6,
    isFavorite: false,
    active: true,
    ...overrides,
  }
}

describe('createCategory', () => {
  it('crea una categoría con id, nombre recortado y días de alerta', () => {
    const input: CategoryInput = { name: '  Vinos  ', expiryAlertDays: 60 }

    const created = createCategory('category-2', input)

    expect(created).toEqual({
      id: 'category-2',
      name: 'Vinos',
      expiryAlertDays: 60,
    })
  })

  it('no muta el objeto de entrada', () => {
    const input: CategoryInput = { name: '  Licores  ', expiryAlertDays: 90 }
    const original = { ...input }

    createCategory('category-3', input)

    expect(input).toEqual(original)
  })

  it('acepta cero días de alerta, igual que el esquema', () => {
    const created = createCategory('category-4', {
      name: 'Sin alerta',
      expiryAlertDays: 0,
    })

    expect(created.expiryAlertDays).toBe(0)
  })
})

describe('updateCategory', () => {
  it('cambia solo el nombre y conserva el id y los días de alerta', () => {
    const updated = updateCategory(category, { name: 'Vinos' })

    expect(updated).toEqual({
      id: 'category-1',
      name: 'Vinos',
      expiryAlertDays: 30,
    })
  })

  it('cambia solo los días de alerta y conserva el nombre', () => {
    const updated = updateCategory(category, { expiryAlertDays: 45 })

    expect(updated).toEqual({
      id: 'category-1',
      name: 'Cervezas',
      expiryAlertDays: 45,
    })
  })

  it('recorta el nuevo nombre', () => {
    const updated = updateCategory(category, { name: '  Vinos finos  ' })

    expect(updated.name).toBe('Vinos finos')
  })

  it('no muta la categoría original y devuelve un objeto nuevo', () => {
    const original = { ...category }

    const updated = updateCategory(category, { name: 'Vinos' })

    expect(category).toEqual(original)
    expect(updated).not.toBe(category)
  })

  it('no permite cambiar el id aunque llegue en los cambios', () => {
    const changesWithId = {
      name: 'Vinos',
      id: 'category-2',
    } as unknown as Partial<CategoryInput>

    const updated = updateCategory(category, changesWithId)

    expect(updated.id).toBe('category-1')
  })
})

describe('canDeleteCategory', () => {
  it('devuelve true cuando no hay productos', () => {
    expect(canDeleteCategory('category-1', [])).toBe(true)
  })

  it('devuelve false cuando un producto usa la categoría', () => {
    const products = [makeProduct({ categoryId: 'category-1' })]

    expect(canDeleteCategory('category-1', products)).toBe(false)
  })

  it('devuelve true cuando los productos pertenecen a otras categorías', () => {
    const products = [
      makeProduct({ id: 'product-1', categoryId: 'category-2' }),
      makeProduct({ id: 'product-2', categoryId: 'category-3' }),
    ]

    expect(canDeleteCategory('category-1', products)).toBe(true)
  })

  it('no muta la lista de productos', () => {
    const products = [makeProduct({ categoryId: 'category-1' })]
    const original = products.map((product) => ({ ...product }))

    canDeleteCategory('category-1', products)

    expect(products).toEqual(original)
  })
})

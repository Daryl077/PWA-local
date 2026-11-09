import { describe, expect, it } from 'vitest'

import type { Product, StockMovement } from '../../../contracts/entities'
import type { ProductInput } from './schemas'
import { canDeleteProduct, createProduct, updateProduct } from './product'

const product: Product = {
  id: 'product-1',
  name: 'Cerveza 620 ml',
  categoryId: 'category-1',
  priceCents: 1500,
  costCents: 900,
  minStock: 6,
  isFavorite: true,
  active: true,
}

function makeReceiptMovement(productId: string, id = 'movement-1'): StockMovement {
  return {
    id,
    productId,
    lotId: 'lot-1',
    occurredAt: '2026-11-08T12:00:00.000Z',
    userId: 'user-1',
    type: 'receipt',
    quantity: 10,
  }
}

describe('createProduct', () => {
  it('crea un producto con id, nombre recortado y todos los campos', () => {
    const input: ProductInput = {
      name: '  Cerveza 620 ml  ',
      categoryId: 'category-1',
      priceCents: 1500,
      costCents: 900,
      minStock: 6,
      isFavorite: true,
      active: true,
    }

    const created = createProduct('product-2', input)

    expect(created).toEqual({
      id: 'product-2',
      name: 'Cerveza 620 ml',
      categoryId: 'category-1',
      priceCents: 1500,
      costCents: 900,
      minStock: 6,
      isFavorite: true,
      active: true,
    })
  })

  it('no muta el objeto de entrada', () => {
    const input: ProductInput = {
      name: '  Vino tinto  ',
      categoryId: 'category-2',
      priceCents: 2500,
      costCents: 1800,
      minStock: 3,
      isFavorite: false,
      active: true,
    }
    const original = { ...input }

    createProduct('product-3', input)

    expect(input).toEqual(original)
  })

  it('acepta precio, costo y stock mínimo en cero, igual que el esquema', () => {
    const created = createProduct('product-4', {
      name: 'Producto de prueba',
      categoryId: 'category-1',
      priceCents: 0,
      costCents: 0,
      minStock: 0,
      isFavorite: false,
      active: false,
    })

    expect(created.priceCents).toBe(0)
    expect(created.costCents).toBe(0)
    expect(created.minStock).toBe(0)
  })
})

describe('updateProduct', () => {
  it('cambia solo el precio y conserva el resto, incluido el id', () => {
    const updated = updateProduct(product, { priceCents: 1800 })

    expect(updated).toEqual({
      ...product,
      priceCents: 1800,
    })
  })

  it('cambia solo el nombre y lo recorta', () => {
    const updated = updateProduct(product, { name: '  Cerveza 750 ml  ' })

    expect(updated).toEqual({
      ...product,
      name: 'Cerveza 750 ml',
    })
  })

  it('permite cambiar la categoría y conserva el resto', () => {
    const updated = updateProduct(product, { categoryId: 'category-2' })

    expect(updated).toEqual({
      ...product,
      categoryId: 'category-2',
    })
  })

  it('no muta el producto original y devuelve un objeto nuevo', () => {
    const original = { ...product }

    const updated = updateProduct(product, { priceCents: 1800 })

    expect(product).toEqual(original)
    expect(updated).not.toBe(product)
  })

  it('no permite cambiar el id aunque llegue en los cambios', () => {
    const changesWithId = {
      priceCents: 1800,
      id: 'product-2',
    } as unknown as Partial<ProductInput>

    const updated = updateProduct(product, changesWithId)

    expect(updated.id).toBe('product-1')
  })
})

describe('canDeleteProduct', () => {
  it('devuelve true cuando no hay movimientos', () => {
    expect(canDeleteProduct('product-1', [])).toBe(true)
  })

  it('devuelve false cuando un movimiento pertenece al producto', () => {
    const movements = [makeReceiptMovement('product-1')]

    expect(canDeleteProduct('product-1', movements)).toBe(false)
  })

  it('devuelve true cuando los movimientos son de otros productos', () => {
    const movements = [
      makeReceiptMovement('product-2', 'movement-1'),
      makeReceiptMovement('product-3', 'movement-2'),
    ]

    expect(canDeleteProduct('product-1', movements)).toBe(true)
  })

  it('no muta la lista de movimientos', () => {
    const movements = [makeReceiptMovement('product-1')]
    const original = movements.map((movement) => ({ ...movement }))

    canDeleteProduct('product-1', movements)

    expect(movements).toEqual(original)
  })
})

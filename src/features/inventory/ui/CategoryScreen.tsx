import { useEffect, useState } from 'react'

import type { AppError } from '../../../contracts/common'
import type { Category } from '../../../contracts/entities'
import type { AuthService, InventoryService } from '../../../contracts/services'
import { CategoryList } from './CategoryList'
import { CategoryForm } from './CategoryForm'
import type { CategoryInput } from '../domain/schemas'

export type CategoryInventoryService = Pick<
  InventoryService,
  'listCategories' | 'createCategory' | 'updateCategory' | 'deleteCategory'
>

type Props = {
  inventoryService: CategoryInventoryService
  auth: AuthService
}

type UpdateCategoryInput = { id: string } & Partial<CategoryInput>

export function CategoryScreen({ inventoryService, auth }: Props) {
  const [categories, setCategories] = useState<readonly Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const canManage = auth.can('manage_categories')

  useEffect(() => {
    async function loadCategories() {
      setIsLoading(true)
      setError(null)

      try {
        const loaded = await inventoryService.listCategories()
        setCategories(loaded)
      } catch {
        setError({
          code: 'LOAD_ERROR',
          what: 'No se pudieron cargar las categorías',
          why: 'El servicio no respondió como se esperaba',
          how: 'Comprueba tu conexión y vuelve a intentar más tarde.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    void loadCategories()
  }, [inventoryService])

  async function handleCreateCategory(input: CategoryInput) {
    try {
      const result = await inventoryService.createCategory(input)
      if (!result.ok) {
        setError(result.error)
        throw new Error(result.error.why)
      }
      await reloadCategories()
      setIsFormOpen(false)
    } catch {
      // Error already handled by parent
    }
  }

  async function handleUpdateCategory(input: UpdateCategoryInput) {
    try {
      const result = await inventoryService.updateCategory(input)
      if (!result.ok) {
        setError(result.error)
        throw new Error(result.error.why)
      }
      await reloadCategories()
      setEditingCategory(null)
      setIsFormOpen(false)
    } catch {
      // Error already handled by parent
    }
  }

  async function handleDeleteCategory(category: Category) {
    try {
      const result = await inventoryService.deleteCategory(category.id)
      if (!result.ok) {
        setError(result.error)
        throw new Error(result.error.why)
      }
      await reloadCategories()
    } catch {
      // Error already handled by parent
    }
  }

  async function reloadCategories() {
    try {
      const loaded = await inventoryService.listCategories()
      setCategories(loaded)
    } catch {
      // Mantener las categorías actuales si falla
    }
  }

  if (isLoading) {
    return <p role="status">Cargando categorías</p>
  }

  return (
    <main className="flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-8">
      <h1 className="text-2xl font-semibold">Inventario</h1>
      <p className="mt-2 max-w-prose text-stone-600">
        Administra las categorías del catálogo.
      </p>

      {error ? (
        <p
          role="alert"
          data-code={error.code}
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error.what} {error.why} {error.how}
        </p>
      ) : null}

      {canManage ? (
        <button
          type="button"
          className="mt-6 min-h-11 w-full rounded-lg bg-amber-600 px-5 font-medium text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          onClick={() => {
            setEditingCategory(null)
            setIsFormOpen(true)
          }}
        >
          Nueva categoría
        </button>
      ) : null}

      <CategoryList
        categories={categories}
        canManage={canManage}
        onEdit={(category) => {
          setEditingCategory(category)
          setIsFormOpen(true)
        }}
        onDelete={handleDeleteCategory}
      />

      {categories.length === 0 ? (
        <p className="mt-6 text-stone-600">Todavía no hay categorías.</p>
      ) : null}

      {isFormOpen ? (
        <CategoryForm
          initialCategory={editingCategory}
          onSubmit={async (input) => {
            if (editingCategory) {
              await handleUpdateCategory({ ...input, id: editingCategory.id })
            } else {
              await handleCreateCategory(input)
            }
          }}
          onCancel={() => {
            setEditingCategory(null)
            setIsFormOpen(false)
          }}
          submitLabel={editingCategory ? 'Guardar cambios' : 'Guardar categoría'}
        />
      ) : null}
    </main>
  )
}
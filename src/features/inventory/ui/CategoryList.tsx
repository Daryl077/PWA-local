import type { Category } from '../../../contracts/entities'

type Props = {
  categories: readonly Category[]
  canManage: boolean
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoryList({ categories, canManage, onEdit, onDelete }: Props) {
  if (categories.length === 0) {
    return null
  }

  return (
    <ul className="mt-6 space-y-3">
      {categories.map((category) => (
        <li
          key={category.id}
          className="flex min-h-14 items-center justify-between rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
        >
          <div className="flex-1">
            <p className="font-medium text-stone-900">{category.name}</p>
            <p className="text-sm text-stone-600">{category.expiryAlertDays} días de alerta</p>
          </div>

          {canManage ? (
            <div className="flex gap-2">
              <button
                type="button"
                aria-label={`Editar ${category.name}`}
                className="min-h-11 rounded-lg bg-white px-3 font-medium text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                onClick={() => onEdit(category)}
              >
                Editar
              </button>
              <button
                type="button"
                aria-label={`Eliminar ${category.name}`}
                className="min-h-11 rounded-lg bg-white px-3 font-medium text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                onClick={() => onDelete(category)}
              >
                Eliminar
              </button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
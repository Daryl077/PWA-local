import type { Cents, Id, IsoDate, IsoDateTime } from '../../../contracts/common'
import type { Lot } from '../../../contracts/entities'

type Props = {
  lots: Lot[]
  today: IsoDate
  expiringLotIds: ReadonlySet<Id>
  showCosts: boolean
  canWaste: boolean
  canAdjust: boolean
  onWaste: (lot: Lot) => void
  onAdjust: (lot: Lot) => void
}

const dateFormatter = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/La_Paz',
})

const numberFormatter = new Intl.NumberFormat('es-BO', {
  maximumFractionDigits: 0,
})

const actionClasses =
  'min-h-11 rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-800 ' +
  'hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600'

function formatDate(date: IsoDate): string {
  return dateFormatter.format(new Date(`${date}T12:00:00.000Z`))
}

function formatTimestamp(timestamp: IsoDateTime): string {
  return dateFormatter.format(new Date(timestamp))
}

function formatCents(cents: Cents): string {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  const whole = Math.trunc(absolute / 100)
  const fraction = String(absolute % 100).padStart(2, '0')

  return `${sign}Bs ${numberFormatter.format(whole)},${fraction}`
}

export function LotList({
  lots,
  today,
  expiringLotIds,
  showCosts,
  canWaste,
  canAdjust,
  onWaste,
  onAdjust,
}: Props) {
  const orderedLots = [...lots].sort(
    (left, right) =>
      left.expiryDate.localeCompare(right.expiryDate) ||
      left.receivedAt.localeCompare(right.receivedAt),
  )

  return (
    <section aria-labelledby="lot-list-title" className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 id="lot-list-title" className="text-lg font-semibold text-stone-900">
        Lotes del producto
      </h2>

      {orderedLots.length === 0 ? (
        <p className="mt-3 text-stone-600">Este producto todavía no tiene lotes.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {orderedLots.map((lot) => {
            const expired = lot.expiryDate < today
            const expiring = expiringLotIds.has(lot.id)
            const expiryLabel = formatDate(lot.expiryDate)

            return (
              <li key={lot.id} className="rounded-xl border border-stone-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-stone-900">Vence el {expiryLabel}</h3>
                    <p className="mt-1 text-sm text-stone-600">
                      Ingresado el {formatTimestamp(lot.receivedAt)}
                    </p>
                    {showCosts ? (
                      <p className="mt-1 text-sm text-stone-600">
                        Costo unitario: {formatCents(lot.unitCostCents)}
                      </p>
                    ) : null}
                  </div>

                  {expired ? (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                      Vencido
                    </span>
                  ) : expiring ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                      Por vencer
                    </span>
                  ) : null}
                </div>

                {canWaste || canAdjust ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canWaste ? (
                      <button
                        type="button"
                        className={actionClasses}
                        aria-label={`Merma del lote que vence el ${expiryLabel}`}
                        onClick={() => onWaste(lot)}
                      >
                        Merma
                      </button>
                    ) : null}
                    {canAdjust ? (
                      <button
                        type="button"
                        className={actionClasses}
                        aria-label={`Ajuste del lote que vence el ${expiryLabel}`}
                        onClick={() => onAdjust(lot)}
                      >
                        Ajuste
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

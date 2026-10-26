const destinations = [
  { label: 'Venta', href: '#venta' },
  { label: 'Inventario', href: '#inventario' },
  { label: 'Caja', href: '#caja' },
  { label: 'Reportes', href: '#reportes' },
] as const

const navLinkClasses =
  'flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-stone-700 ' +
  'hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600'

function App() {
  return (
    <div className="min-h-dvh bg-stone-100 text-stone-900 md:flex">
      <aside className="hidden border-r border-stone-200 bg-white md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col md:p-4">
        <p className="px-3 py-4 text-lg font-semibold">Licorería</p>
        <nav aria-label="Navegación lateral" className="mt-2">
          <ul className="space-y-1">
            {destinations.map((destination) => (
              <li key={destination.href}>
                <a href={destination.href} className={navLinkClasses}>
                  {destination.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-h-dvh flex-col md:flex-1">
        <header className="flex min-h-14 items-center border-b border-stone-200 bg-white px-4 md:hidden">
          <p className="text-lg font-semibold">Licorería</p>
        </header>

        <main className="flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-8">
          <h1 className="text-2xl font-semibold">Punto de venta</h1>
          <p className="mt-2 max-w-prose text-stone-600">
            Aquí se arma el ticket y se cobra. Las demás pantallas se conectan en las siguientes
            tareas.
          </p>
          <a
            href="#venta"
            className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-amber-600 px-5 font-medium text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            Nueva venta
          </a>
        </main>

        <nav
          aria-label="Navegación inferior"
          className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <ul className="grid grid-cols-4">
            {destinations.map((destination) => (
              <li key={destination.href}>
                <a
                  href={destination.href}
                  className="flex min-h-14 items-center justify-center px-1 text-xs font-medium text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                >
                  {destination.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}

export default App

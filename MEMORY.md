# MEMORY.md

## Estado actual
- Tareas de Cimientos, Fase 1 (Persona 1) y carril completo de Persona 2 (T-003, T-004, T-006, T-007, T-008, T-009) integradas en main.
- Próximos pasos: Iniciar la Fase 2 del proyecto.
- Versiones instaladas:
  - Node.js: >=22.12.0
  - React / React-DOM: 19.3.1
  - TypeScript: 6.0.3
  - Vite: 8.3.5 (@vitejs/plugin-react 6.1.2)
  - ESLint: 10.13.0 (@eslint/js 10.0.1, typescript-eslint 8.72.0 con regla local de arquitectura)
  - Prettier: 3.9.10
  - Vitest: 5.0.5 (jsdom 28.1.0, fake-indexeddb)
  - Testing Library React: 16.3.3 (@testing-library/jest-dom 7.0.1)
  - Tailwind CSS: 4.3.3 (@tailwindcss/vite 4.3.3)
  - PWA: vite-plugin-pwa 2.0.0 (workbox 7.4.1)
  - Storage: Dexie & Navigator Storage API
  - Validation: Zod 4.6.7
  - CI: GitHub Actions (.github/workflows/ci.yml con Node 22)
  - Utils: Script `npm run context` para empaquetado de contexto.
- Integrador del equipo: daryl.

## Decisiones tomadas
- La licorería pidió un sistema local, en un solo dispositivo. Por eso es una PWA sin backend, con los datos en Dexie (IndexedDB) detrás de interfaces de almacenamiento. Así se puede agregar un servidor después sin reescribir las reglas de negocio.
- Se descartó el diseño anterior (NestJS, Prisma y PostgreSQL) porque el sistema es local.
- Roles: solo Dueño y Vendedor. No hay Bodeguero. El dueño designa a los vendedores.
- Dinero en centavos enteros. Vencimiento como fecha sin hora (YYYY-MM-DD).
- Plataformas objetivo: Android, iPhone, iPad y tablets, instalando la PWA desde el navegador.
- Desarrollo en equipo de dos personas, cada una con su agente. Módulos por área de negocio (no micro-módulos), que se hablan solo por los contratos de docs/CONTRATOS.md.
- Un solo archivo de reglas, AGENTS.md, compatible con opencode y Antigravity.
- Si se acaban los tokens, se usa el modo chat web de docs/MODELOS.md.
- Ajustes de gobernanza (auditoría Nemotron): se dividieron T-002 (a/b), T-013 (a/b) y T-015 (a/b) para eliminar la dependencia circular T-010 <-> T-015 y permitir el inicio limpio de la Fase 1.

## Pendiente de confirmar con el dueño
- Si necesita ver ventas y reportes desde su propio celular (si la respuesta es sí, hará falta servidor o sincronización).
- Venta a crédito y cuentas por cobrar (RF-RPT-03): diferido a Fase 8.
- Qué hacer cuando se vende más que el stock registrado (fijado provisionalmente en R-04: rechazo total).

## Hoja de ruta
- Cimientos y Calidad: T-001 [x], T-002a [x], T-002b [x], T-005 [x].
- Fase 1 (Persona 1): T-015a [x], T-010 [x], T-011 [x], T-012 [x], T-013a [x], T-013b [x], T-014 [x], T-015b [x].
- En paralelo (Persona 2): T-003 [x], T-004 [x], T-006 [x], T-007 [x], T-008 [x], T-009 [x].
- Fase 2 a 7: Inventario, Caja, Ventas, Respaldo, Compras, Reportes.

## Errores a evitar
- Vite 8 exige Node >=22.12.0; no bajar esa versión.
- En ramas de tareas no editar MEMORY.md ni docs/TAREAS.md (solo el integrador en main).

## INV-010a Pantalla de categorías

- INV-010a quedó terminada con commit f2eadb8.
- Se agregaron CategoryList, CategoryForm, CategoryScreen y CategoryScreen.test.tsx.
- La pantalla usa CategoryInventoryService y auth por props.
- El Dueño puede crear, editar y eliminar categorías.
- El Vendedor solo puede ver categorías.
- Los permisos se validan con auth.can('manage_categories').
- Los errores usan Result y AppError.
- Las alertas exponen data-code.
- Los botones Editar/Eliminar tienen aria-label con el nombre de la categoría.
- El formulario permite enviar un nombre corto para que Zod muestre el error.
- Se mantienen estados de carga, lista vacía y error.
- No se tocaron index.ts, fake.ts, dominio, contratos, almacenamiento, app.tsx ni app-root.tsx.
- Lint, typecheck, test y build quedaron en verde.
- La suite completa pasó 200/200.

## Siguiente tarea: INV-011

- La siguiente tarea de inventario es INV-011: modelo de lote y movimientos de stock.
- Se basa en T015 de specs/001-inventory-module/tasks.md.
- Cubre RF-INV-02, RF-INV-03 y RF-INV-06.
- La tarea es solo dominio y pruebas.
- No incluye UI, navegación, conexión con app, contratos ni almacenamiento.
- Los movimientos de stock son inmutables y append-only.
- Una venta referencia el lote del que salió el stock.
- Una merma registra motivo y pérdida.
- Un ajuste registra delta y motivo.

## INV-011 Modelo de lote y movimientos de stock

- INV-011 quedó terminada.
- Se agregaron lot.ts, stock-movement.ts y stock-logic.ts.
- Se agregaron pruebas de dominio para lotes y movimientos.
- Los movimientos son inmutables y append-only.
- Una venta referencia el lote del que salió el stock.
- Una merma registra motivo y pérdida.
- Un ajuste registra delta y motivo.
- PEPS excluye lotes vencidos.
- Una venta sin stock suficiente devuelve INSUFFICIENT_STOCK.
- No se tocaron contratos, almacenamiento, UI, index.ts, fake.ts, app.tsx ni app-root.tsx.
- Lint, typecheck, test y build quedaron en verde.
- La suite completa pasó 126/126.

# MEMORY.md

## Estado actual
- Tareas T-001, T-002a, T-002b, T-003, T-004, T-005, T-006, T-015a y T-010 completadas e integradas en main.
- Siguiente tarea: T-011 (Hash de contraseñas con Web Crypto PBKDF2) para Persona 1 / T-007 (Regla de importaciones entre módulos) para Persona 2.
- Versiones instaladas:
  - Node.js: >=22.12.0
  - React / React-DOM: 19.3.1
  - TypeScript: 6.0.3
  - Vite: 8.3.5 (@vitejs/plugin-react 6.1.2)
  - ESLint: 10.13.0 (@eslint/js 10.0.1, typescript-eslint 8.72.0)
  - Prettier: 3.9.10
  - Vitest: 5.0.5 (jsdom 28.1.0, fake-indexeddb)
  - Testing Library React: 16.3.3 (@testing-library/jest-dom 7.0.1)
  - Tailwind CSS: 4.3.3 (@tailwindcss/vite 4.3.3)
  - PWA: vite-plugin-pwa 2.0.0 (workbox 7.4.1)
  - Storage: Dexie & Navigator Storage API
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
- Fase 1 (Persona 1): T-015a [x], T-010 [x], T-011 [ ] (siguiente Persona 1), T-012, T-013a/b, T-014, T-015b.
- En paralelo (Persona 2): T-003 [x], T-004 [x], T-006 [x], T-007 [ ] (siguiente Persona 2), T-008, T-009.
- Fase 2 a 7: Inventario, Caja, Ventas, Respaldo, Compras, Reportes.

## Errores a evitar
- Vite 8 exige Node >=22.12.0; no bajar esa versión.
- En ramas de tareas no editar MEMORY.md ni docs/TAREAS.md (solo el integrador en main).
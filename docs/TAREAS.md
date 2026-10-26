# TAREAS.md

Cada tarea es una sesión. Tamaño máximo: unos 5 archivos y 150 líneas nuevas[cite: 7].
Estado: `[ ]` pendiente, `[x]` hecha. La rama de cada tarea es `feat/T-0XX-nombre`[cite: 7].
Quien integra (hace merge) actualiza este archivo y `MEMORY.md`. En una rama de tarea no se editan[cite: 7].

## Cimientos y Calidad
- [x] **T-001 Proyecto base**
  - Responsable: Persona 1. Depende de: nada[cite: 7].
  - Objetivo: proyecto Vite con React y TypeScript estricto, scripts de `package.json` según AGENTS.md y `.gitignore`[cite: 1, 7].
  - Requisitos: RNF-PLA-01[cite: 6, 7].
  - Criterios: `npm run dev` y `npm run build` funcionan. Existen las carpetas `src/contracts`, `src/storage`, `src/features`, `src/shared` y `scripts` (con `.gitkeep`)[cite: 1, 3, 7].
- [x] **T-002a Linter y Formato**
  - Responsable: Persona 1. Depende de: T-001.
  - Objetivo: ESLint con configuración plana (sin `any`, límite de complejidad) y Prettier.
  - Criterios: `npm run lint` pasa correctamente.
- [x] **T-002b Framework de Pruebas**
  - Responsable: Persona 1. Depende de: T-002a.
  - Objetivo: Vitest y Testing Library con una prueba de ejemplo.
  - Criterios: `npm run test` pasa.
- [ ] **T-005 Almacenamiento local**
  - Responsable: Persona 1. Depende de: T-002b[cite: 7].
  - Objetivo: `src/contracts/storage.ts` con las interfaces `Repository`, `AppendOnlyRepository` y `Storage` de CONTRATOS.md, y su implementación con Dexie en `src/storage/`, con el esquema versión 1 mínimo (tabla `settings`)[cite: 3, 7].
  - Requisitos: RNF-PLA-05[cite: 6, 7].
  - Criterios: pruebas de lectura, escritura y transacción que se deshace si falla. Se autoriza `fake-indexeddb` solo para pruebas[cite: 7].

## Fase 1: Seguridad y Roles Locales (Persona 1)
- [ ] **T-015a Tipos y Contratos del Dominio**
  - Responsable: Persona 1. Depende de: T-005.
  - Objetivo: Crear `src/contracts/` con los tipos base y las interfaces esenciales de CONTRATOS.md para desbloquear el dominio (rompe el ciclo con T-010)[cite: 3].
  - Criterios: Typecheck pasa y los contratos básicos están disponibles.
- [ ] **T-010 Roles y permisos en el dominio**
  - Responsable: Persona 1. Depende de: T-015a[cite: 7].
  - Objetivo: tipos `Role` y `Action` y función `can(role, action)` en `src/features/auth/domain/`[cite: 7].
  - Requisitos: RF-SEG-02, RF-SEG-04[cite: 6, 7].
  - Criterios: pruebas que confirman que el Vendedor no puede ver costos ni administrar usuarios[cite: 7].
- [ ] **T-011 Hash de contraseñas**
  - Responsable: Persona 1. Depende de: T-002b[cite: 7].
  - Objetivo: función para guardar y verificar contraseñas con Web Crypto (PBKDF2)[cite: 7].
  - Requisitos: RF-SEG-01[cite: 6, 7].
  - Criterios: la contraseña nunca se guarda en texto plano. Una contraseña errónea falla con un mensaje claro[cite: 7].
- [ ] **T-012 Primer uso: crear al Dueño**
  - Responsable: Persona 1. Depende de: T-005, T-010, T-011[cite: 7].
  - Objetivo: pantalla que crea el usuario Dueño la primera vez que se abre la app[cite: 7].
  - Requisitos: RF-SEG-01[cite: 6, 7].
  - Criterios: solo se puede crear un Dueño. Validación de entradas con Zod[cite: 7].
- [ ] **T-013a Autenticación (Login / Logout)**
  - Responsable: Persona 1. Depende de: T-012.
  - Objetivo: Implementar inicio de sesión y cierre de sesión de forma independiente de la UI pesada.
  - Requisitos: RF-SEG-01[cite: 6, 7].
  - Criterios: Permite autenticar credenciales correctamente mediante contratos[cite: 3].
- [ ] **T-013b Protección y Bloqueo Rápido**
  - Responsable: Persona 1. Depende de: T-013a[cite: 7].
  - Objetivo: bloqueo rápido de la sesión y protección de rutas[cite: 7].
  - Requisitos: RF-SEG-01, RNF-PLA-09[cite: 6, 7].
  - Criterios: las pantallas protegidas no se abren sin sesión. El Vendedor no ve las pantallas del Dueño[cite: 7].
- [ ] **T-014 Gestión de vendedores**
  - Responsable: Persona 1. Depende de: T-013b[cite: 7].
  - Objetivo: el Dueño crea, activa y desactiva vendedores[cite: 7].
  - Requisitos: RF-SEG-03[cite: 6, 7].
  - Criterios: un vendedor desactivado no puede iniciar sesión. Solo el Dueño accede a esta pantalla[cite: 7].
- [ ] **T-015b Fakes de Servicios**
  - Responsable: Persona 1. Depende de: T-014, T-005[cite: 7].
  - Objetivo: Implementar los fakes en memoria para `InventoryService`, `CashService`, `SalesService` y `BackupService`[cite: 3, 7].
  - Criterios: Cada fake tiene una prueba mínima y permite iniciar el trabajo de la Persona 2[cite: 3, 7].

## En paralelo desde el inicio (Persona 2)
- [ ] **T-003 Estilos y diseño base**
  - Responsable: Persona 2. Depende de: T-001[cite: 7].
  - Objetivo: Tailwind CSS 4 con el plugin de Vite y un diseño base con barra de navegación inferior en celular y lateral en tablet[cite: 7].
  - Requisitos: RNF-PLA-02[cite: 6, 7].
  - Criterios: se ve bien a 360 px y a 768 px de ancho. Botones de al menos 44 px[cite: 7].
- [ ] **T-004 PWA instalable**
  - Responsable: Persona 2. Depende de: T-001[cite: 7].
  - Objetivo: vite-plugin-pwa con manifest e íconos de prueba[cite: 7].
  - Requisitos: RNF-PLA-01, RNF-PLA-05[cite: 6, 7].
  - Criterios: tras `npm run build` y `npm run preview`, la app se puede instalar y carga sin conexión[cite: 7].
- [ ] **T-006 Almacenamiento persistente**
  - Responsable: Persona 2. Depende de: T-004, T-005[cite: 7].
  - Objetivo: pedir almacenamiento persistente al iniciar y mostrar en una pantalla "Estado del sistema" si se concedió y cuánto espacio se usa[cite: 1, 7].
  - Requisitos: RNF-PLA-06[cite: 6, 7].
  - Criterios: la pantalla muestra ambos datos y maneja el caso en que el navegador no lo permite[cite: 7].
- [ ] **T-007 Regla de importaciones entre módulos**
  - Responsable: Persona 2. Depende de: T-002b[cite: 7].
  - Objetivo: una regla de ESLint que impida importar archivos internos de otro módulo. Debe permitir solo `index.ts` y `src/contracts/`[cite: 3, 7].
  - Criterios: una prueba o ejemplo que demuestre que importar un archivo interno falla el lint, y que importar desde `index.ts` pasa[cite: 7].
- [ ] **T-008 Integración continua**
  - Responsable: Persona 2. Depende de: T-002b[cite: 7].
  - Objetivo: flujo de GitHub Actions que corre `lint`, `typecheck`, `test` y `build` en cada PR, con Node 22[cite: 1, 7].
  - Criterios: un PR con un error de lint lo bloquea[cite: 7].
- [ ] **T-009 Paquete de contexto para chat web**
  - Responsable: Persona 2. Depende de: T-001[cite: 7].
  - Objetivo: `scripts/context-pack.mjs` (Node, sin dependencias) y el script `npm run context`[cite: 7].
  - Criterios: una prueba confirma que el paquete incluye cada sección y avisa el tamaño aproximado[cite: 7].
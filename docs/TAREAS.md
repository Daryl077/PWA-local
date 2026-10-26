# TAREAS.md

Cada tarea es una sesión. Tamaño máximo: unos 5 archivos y 150 líneas nuevas. Si una tarea no cabe, se divide.
Estado: `[ ]` pendiente, `[x]` hecha. La rama de cada tarea es `feat/T-0XX-nombre`.
Quien integra (hace merge) actualiza este archivo y `MEMORY.md`. En una rama de tarea no se editan.

## Cimientos (una sola persona, en orden)
Antes de dividir el trabajo, la Persona 1 deja listo lo que todo lo demás necesita.

### [ ] T-001 Proyecto base
- Responsable: Persona 1. Depende de: nada.
- Objetivo: proyecto Vite con React y TypeScript estricto, scripts de `package.json` según AGENTS.md y `.gitignore`.
- Requisitos: RNF-PLA-01.
- Criterios: `npm run dev` y `npm run build` funcionan. Existen las carpetas `src/contracts`, `src/storage`, `src/features`, `src/shared` y `scripts` (con `.gitkeep`). Las versiones exactas quedan anotadas en la respuesta final para MEMORY.md.

### [ ] T-002 Calidad automática
- Responsable: Persona 1. Depende de: T-001.
- Objetivo: ESLint con configuración plana (sin `any`, límite de complejidad), Prettier, Vitest y Testing Library con una prueba de ejemplo.
- Criterios: `npm run lint`, `npm run typecheck` y `npm run test` pasan.

### [ ] T-005 Almacenamiento local
- Responsable: Persona 1. Depende de: T-002.
- Objetivo: `src/contracts/storage.ts` con las interfaces `Repository`, `AppendOnlyRepository` y `Storage` de CONTRATOS.md, y su implementación con Dexie en `src/storage/`, con el esquema versión 1 mínimo (tabla `settings`).
- Requisitos: RNF-PLA-05.
- Criterios: pruebas de lectura, escritura y transacción que se deshace si falla. Se autoriza `fake-indexeddb` solo para pruebas.

## Fase 1: seguridad y roles locales (Persona 1)

### [ ] T-010 Roles y permisos en el dominio
- Responsable: Persona 1. Depende de: T-002.
- Objetivo: tipos `Role` y `Action` y función `can(role, action)` en `src/features/auth/domain/`.
- Requisitos: RF-SEG-02, RF-SEG-04.
- Criterios: pruebas que confirman que el Vendedor no puede ver costos ni administrar usuarios.

### [ ] T-011 Hash de contraseñas
- Responsable: Persona 1. Depende de: T-002.
- Objetivo: función para guardar y verificar contraseñas con Web Crypto (PBKDF2).
- Requisitos: RF-SEG-01.
- Criterios: la contraseña nunca se guarda en texto plano. Una contraseña errónea falla con un mensaje claro.

### [ ] T-012 Primer uso: crear al Dueño
- Responsable: Persona 1. Depende de: T-005, T-010, T-011.
- Objetivo: pantalla que crea el usuario Dueño la primera vez que se abre la app.
- Requisitos: RF-SEG-01.
- Criterios: solo se puede crear un Dueño. Validación de entradas con Zod.

### [ ] T-013 Inicio de sesión y bloqueo rápido
- Responsable: Persona 1. Depende de: T-012, T-003.
- Objetivo: inicio de sesión, cierre y bloqueo rápido de la sesión.
- Requisitos: RF-SEG-01, RNF-PLA-09.
- Criterios: las pantallas protegidas no se abren sin sesión. El Vendedor no ve las pantallas del Dueño.

### [ ] T-014 Gestión de vendedores
- Responsable: Persona 1. Depende de: T-013.
- Objetivo: el Dueño crea, activa y desactiva vendedores.
- Requisitos: RF-SEG-03.
- Criterios: un vendedor desactivado no puede iniciar sesión. Solo el Dueño accede a esta pantalla.

### [ ] T-015 Contratos en código y fakes
- Responsable: Persona 1. Depende de: T-005, T-010.
- Objetivo: crear `src/contracts/` con los tipos y las interfaces de CONTRATOS.md, y un `fake.ts` en memoria para `InventoryService`, `CashService`, `SalesService` y `BackupService`.
- Criterios: typecheck pasa. Cada fake tiene una prueba mínima. Los tipos coinciden con CONTRATOS.md. Con esta tarea terminada, la Persona 2 puede empezar sus módulos.

## En paralelo desde el inicio (Persona 2)

### [ ] T-003 Estilos y diseño base
- Responsable: Persona 2. Depende de: T-001.
- Objetivo: Tailwind CSS 4 con el plugin de Vite y un diseño base con barra de navegación inferior en celular y lateral en tablet.
- Requisitos: RNF-PLA-02.
- Criterios: se ve bien a 360 px y a 768 px de ancho. Botones de al menos 44 px.

### [ ] T-004 PWA instalable
- Responsable: Persona 2. Depende de: T-001.
- Objetivo: vite-plugin-pwa con manifest e íconos de prueba.
- Requisitos: RNF-PLA-01, RNF-PLA-05.
- Criterios: tras `npm run build` y `npm run preview`, la app se puede instalar y carga sin conexión.

### [ ] T-006 Almacenamiento persistente
- Responsable: Persona 2. Depende de: T-004, T-005.
- Objetivo: pedir almacenamiento persistente al iniciar y mostrar en una pantalla "Estado del sistema" si se concedió y cuánto espacio se usa.
- Requisitos: RNF-PLA-06.
- Criterios: la pantalla muestra ambos datos y maneja el caso en que el navegador no lo permite.

### [ ] T-007 Regla de importaciones entre módulos
- Responsable: Persona 2. Depende de: T-002.
- Objetivo: una regla de ESLint que impida importar archivos internos de otro módulo. Debe permitir solo `index.ts` y `src/contracts/`. Preferir `no-restricted-imports` de ESLint antes de agregar un plugin.
- Criterios: una prueba o ejemplo que demuestre que importar `features/inventory/domain/x` desde `features/sales` falla el lint, y que importar desde `features/inventory` (su `index.ts`) pasa.

### [ ] T-008 Integración continua
- Responsable: Persona 2. Depende de: T-002.
- Objetivo: flujo de GitHub Actions que corre `lint`, `typecheck`, `test` y `build` en cada PR, con Node 22.
- Criterios: un PR con un error de lint lo bloquea. Documentar en un comentario del flujo cómo proteger la rama `main`. Si el plan gratuito no permite proteger la rama, acordar la regla entre las dos personas.

### [ ] T-009 Paquete de contexto para chat web
- Responsable: Persona 2. Depende de: T-001.
- Objetivo: `scripts/context-pack.mjs` (Node, sin dependencias) y el script `npm run context`. Recibe un ID de tarea y rutas de archivos. Imprime, con encabezados `=== ARCHIVO: ruta ===`: `AGENTS.md`, `MEMORY.md`, el bloque de esa tarea de `docs/TAREAS.md`, `docs/CONTRATOS.md` y el contenido de las rutas dadas. Con la opción `--reglas` incluye también `docs/REGLAS.md`.
- Criterios: una prueba confirma que el paquete incluye cada sección. Al final avisa el tamaño aproximado en caracteres.

## Carriles de trabajo desde la Fase 2
Cuando T-015 esté hecha, cada persona toma un carril. Sugerido:

- **Persona 1:** Fase 2 inventario (RF-INV-01 a 05), luego Fase 6 compras, porque compras crea los lotes.
- **Persona 2:** Fase 4 caja (RF-CAJ-01 a 03), luego Fase 3 ventas contra el fake de inventario, luego Fase 5 respaldo.
- **Los dos:** Fase 7 reportes, al final, porque depende de todos los datos.

Las tareas detalladas de cada fase se escriben al llegar, con el mismo formato. Quien integra agrega las versiones del esquema de Dexie y las dependencias nuevas.
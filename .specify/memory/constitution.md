<!--
Sync Impact Report:
- Version change: 1.1.1 -> 1.2.0
- Modified sections: Core Principles (cache version bullet), Additional Constraints (Backup & Data Export details)
- Added sections: none
- Removed sections: none
- Follow-up TODOs: none
-->

# Licoreria PWA Constitution

## Core Principles

### I. Local-First PWA
La aplicación es una PWA local para un dispositivo del local.

- Debe funcionar sin conexión después de la primera carga e instalación.
- Debe poder instalarse en Android, iPhone, iPad y tablets desde el navegador.
- No debe depender de un backend, servidor propio ni servicios en la nube.
- Los datos del negocio se almacenan localmente en el dispositivo.
- El acceso desde otro dispositivo no forma parte del alcance inicial.

### II. Local Data Persistence
Los datos críticos del negocio deben persistir localmente mediante IndexedDB.

- La implementación de almacenamiento debe usar Dexie sobre IndexedDB.
- `IndexedDB` debe usarse para usuarios, categorías, productos, lotes, movimientos de stock, ventas, sesiones de caja, gastos de caja y configuraciones.
- `localStorage` solo puede usarse para preferencias ligeras de interfaz.
- La capa de almacenamiento debe permanecer desacoplada del dominio mediante `src/contracts`.
- Las operaciones que afectan inventario y ventas deben usar transacciones atómicas.

### III. Deterministic Offline Caching
El Service Worker debe garantizar disponibilidad offline y actualización controlada.

- `vite-plugin-pwa` debe precachear el app shell y los assets críticos.
- Los recursos estáticos deben servirse mediante cache-first.
- Cada release debe generar una nueva versión de precacheo mediante el build de Vite y vite-plugin-pwa.
- El Service Worker debe implementar una estrategia explícita de actualización.
- No se permite depender del comportamiento por defecto del navegador para invalidar caché.

### IV. Installable PWA
La aplicación debe poder instalarse como PWA.

- Debe existir un `manifest.json` válido generado por `vite-plugin-pwa`.
- El manifest debe definir nombre, descripción, `start_url`, `display`, colores e íconos de 192x192 y 512x512.
- Durante desarrollo, la app debe funcionar bajo `http://localhost`.
- Para instalar en celulares o tablets remotos, la app debe servirse mediante HTTPS.
- La experiencia instalada debe abrir en modo independiente y conservar el estado local.

### V. Modular Architecture
El código debe mantener límites claros entre módulos.

- `src/contracts` define los tipos y contratos compartidos.
- `src/features` contiene módulos por área de negocio.
- `src/storage` implementa la persistencia con Dexie.
- Un módulo solo puede importar otro módulo mediante su `index.ts` público.
- Está prohibido importar archivos internos de otro módulo.
- Está prohibido usar `any` explícito.

### VI. Security by Default
La seguridad debe proteger el uso local del dispositivo.

- Las contraseñas nunca se guardan en texto plano.
- Debe usarse hashing con Web Crypto PBKDF2.
- Solo existen los roles `owner` y `seller`.
- El Vendedor no puede ver costos, administrar usuarios ni acceder a reportes financieros.
- El bloqueo rápido conserva la sesión, pero revoca permisos hasta desbloquear.
- La sesión se cierra al recargar la aplicación.

## Additional Constraints

### Technology Stack
- **Build Tool:** Vite.
- **UI Framework:** React + TypeScript.
- **Storage:** Dexie sobre IndexedDB.
- **PWA:** `vite-plugin-pwa` + Workbox.
- **Validation:** Zod.
- **Testing:** Vitest + Testing Library + fake-indexeddb.
- **Styling:** Tailwind CSS.
- **CI:** GitHub Actions con Node 22.

### Backup & Data Export
- Respaldo local mediante exportación a archivo JSON descargado directamente; la Web Share API es una mejora progresiva disponible solo si el entorno lo soporta.
- La exportación incluye todos los datos del negocio **excepto** hashes de contraseñas y tokens de sesión.
- Al importar, se valida el contenido con Zod y se solicita confirmación antes de sobrescribir datos existentes.
- Un recordatorio de respaldo aparece como máximo una vez cada 24 horas y nunca interrumpe ventas, aperturas de caja ni operaciones críticas.

### Service Worker Generation
- No crear ni modificar manualmente `public/sw.js`; el Service Worker es generado automáticamente por `vite-plugin-pwa`.

## Quality Gates
- `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` deben pasar antes de integrar.
- Ninguna feature debe introducir dependencias remotas en producción.
- Toda funcionalidad de datos debe incluir pruebas de persistencia y recuperación.
- Toda funcionalidad crítica debe verificarse en modo offline.
- Los cambios al Service Worker, manifest o esquema Dexie requieren revisión explícita.

## Governance
Esta constitución prevalece sobre convenciones ad hoc y decisiones de implementación que la contradigan.

- Los principios I–VI son obligatorios.
- Toda especificación, plan y conjunto de tareas debe evaluarse contra esta constitución antes de implementarse.
- Una violación debe resolverse ajustando especificación, plan o tareas; no se permite debilitar un principio para facilitar la implementación.
- Las excepciones deben documentarse en el plan correspondiente con justificación técnica.
- Los cambios requieren incrementar la versión, explicar el impacto y revisar los artefactos afectados.

**Version**: 1.2.0 | **Ratified**: 2026-11-07 | **Last Amended**: 2026-11-07

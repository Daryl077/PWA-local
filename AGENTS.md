# AGENTS.md - Licorería PWA

Aplicación web instalable (PWA) que funciona sin internet, para gestionar una licorería desde un celular o tablet: inventario con vencimientos, ventas, caja por turnos, compras y reportes del dueño. Los datos viven en el dispositivo del local. Es un proyecto de la materia Arquitectura de Software. La usan el dueño y los vendedores que él designe. Lo desarrollan dos personas, cada una con su agente.

## Stack y estructura
- Un solo proyecto, sin backend ni monorepo. TypeScript estricto, Node.js 22 o superior, npm.
- React 19, Vite, Tailwind CSS 4 (plugin `@tailwindcss/vite`), React Router, Zod, vite-plugin-pwa.
- Datos locales: Dexie (IndexedDB) con dexie-react-hooks.
- Pruebas: Vitest y Testing Library. Playwright se agrega más adelante.
- Al crear el proyecto, fija las versiones exactas en `package.json` y anótalas en `MEMORY.md`.
- Si el MCP context7 está disponible, consulta la documentación vigente de una librería antes de usar su API.
- `docs/Requerimientos.md`: requisitos del dueño con ID (RF-... y RNF-...) y prioridad. Es la fuente de verdad.
- `docs/REGLAS.md`: reglas de negocio con ejemplos numéricos. De aquí salen las pruebas del dominio.
- `docs/CONTRATOS.md`: entidades e interfaces entre módulos. Es el acuerdo entre las dos personas.
- `docs/TAREAS.md`: tareas pequeñas con responsable, dependencias y criterios de aceptación.
- `docs/MODELOS.md`: modelos, skills y flujo de trabajo de las personas. No lo modifiques.
- `src/contracts/`: el código de `docs/CONTRATOS.md` (tipos, interfaces de servicios e interfaces de almacenamiento).
- `src/features/<modulo>/`: un módulo por área (auth, inventory, sales, cash, purchases, reports, backup). Cada uno tiene `index.ts` (lo único que otros módulos pueden importar), `domain/` (reglas puras, sin React ni Dexie), `ui/` y `fake.ts` (versión en memoria del servicio, para las pruebas de otros módulos).
- `src/storage/`: implementación con Dexie de las interfaces de `src/contracts/`. Es el único lugar que usa Dexie.
- `src/shared/`: componentes y utilidades comunes.
- `scripts/`: utilidades de apoyo, por ejemplo `context-pack.mjs`.

## Comandos
```
npm install
npm run dev          # servidor de desarrollo (Vite)
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview      # prueba la versión compilada y la PWA
npm run context      # arma el paquete de contexto para un chat web (ver docs/MODELOS.md)
```
Si un comando aún no existe, créalo en `package.json` y actualiza esta sección. No inventes comandos.

## Convenciones
- Identificadores (variables, tipos, tablas) en inglés. Textos de pantalla, mensajes de error, comentarios y commits en español.
- Archivos en kebab-case, componentes y tipos en PascalCase, funciones en camelCase.
- Dinero: enteros en centavos de boliviano (Bs). En pantalla se muestra como `Bs 1.234,50` con `Intl.NumberFormat('es-BO')`.
- Fechas de vencimiento: texto `YYYY-MM-DD`, sin hora. Fechas de eventos: ISO 8601 en UTC. En pantalla se muestran en `America/La_Paz`.
- Las funciones de negocio reciben la fecha de hoy como parámetro. No llaman a `Date.now()` por dentro, para poder probarlas.
- Un módulo solo importa de otro por su `index.ts` o desde `src/contracts/`. Nunca archivos internos.
- Interfaz móvil primero, que funcione en vertical y horizontal. En pantallas anchas la venta usa dos columnas (productos y ticket). Botones de al menos 44 px y pocos toques por venta.
- El primer módulo terminado (auth) es el archivo de referencia de estructura. Anótalo en `MEMORY.md`.
- Commits tipo Conventional Commits con el ID del requisito. Ejemplo: `feat(inventory): alerta de vencimiento (RF-INV-04)`.
- Escribe código para que lo entienda una persona. Los nombres dicen la intención de negocio (`calculateChange`, no `calc2`). Sin trucos ni líneas difíciles de leer.
- Cada función hace una sola cosa y trabaja a un solo nivel de detalle.
- Usa tipos estrictos y uniones discriminadas para que un estado inválido no se pueda escribir. Ejemplo: el cobro es `{ type: 'cash', receivedCents, changeCents } | { type: 'qr', receiptConfirmed }`.
- Diseña funciones e interfaces para que lo correcto sea lo más fácil y lo incorrecto falle pronto.
- Mantén la simplicidad. No crees una abstracción hasta repetir el mismo caso tres veces. Duplicar un poco cuesta menos que abstraer mal.
- Usa tecnología probada y nativa del navegador antes que una librería nueva.
- Todo mensaje de error dice qué pasó, por qué y cómo solucionarlo, en español sencillo. Ejemplo: "No se pudo abrir la caja. Ya tienes un turno abierto. Ciérralo antes de abrir otro."

## Reglas de dominio / trampas conocidas
- Implementa primero los requisitos Must. Los Should y Could solo cuando se pidan.
- Todo dato se lee y se escribe por las interfaces de `src/contracts/`. Dexie solo se usa dentro de `src/storage/`.
- Los módulos hablan entre sí solo por los servicios de `src/contracts/`. En las pruebas de un módulo usa los `fake.ts` de los demás, no sus implementaciones reales.
- El stock se guarda por lote con fecha de vencimiento. Cada cambio es un movimiento (ingreso, venta, merma, ajuste) que no se edita ni se borra. Una corrección es un movimiento nuevo.
- Una venta, sus movimientos de stock y su cobro se guardan en una sola transacción con `storage.transaction`. Si algo falla, no queda nada a medias. Registrar dos veces la misma venta (mismo `id`) no la duplica.
- El esquema de Dexie tiene versiones. Cada cambio de tablas es una versión nueva con su migración. Nunca edites una versión ya publicada, porque se pierden o se corrompen los datos del dispositivo. Las versiones las agrega solo quien integra.
- Roles: Dueño y Vendedor. Solo el Dueño crea, activa y desactiva vendedores. Los permisos se validan en los casos de uso y no solo ocultando botones.
- Contraseñas o PIN se guardan con hash (Web Crypto, PBKDF2), nunca en texto plano. Costos, márgenes y ganancias solo se muestran al Dueño. Como los datos están en el dispositivo, esta protección tiene límites.
- Cobro por QR: el vendedor confirma el comprobante a mano en pantalla. No se integra ninguna API bancaria.
- Los datos locales pueden borrarse, sobre todo en iOS. Al iniciar, pide almacenamiento persistente con `navigator.storage.persist()`.
- Copia de seguridad: exportar un archivo JSON y compartirlo con la Web Share API, con recordatorio diario al abrir la app. Al importar, valida el archivo con Zod y pide confirmación antes de reemplazar datos.
- En iOS no hay aviso de instalación automático ni sincronización en segundo plano. No dependas de tareas en segundo plano.
- Seguridad por defecto: valida toda entrada externa (formularios y archivos importados) con Zod. No uses `dangerouslySetInnerHTML`. No escribas secretos en el código.
- Los datos de prueba son inventados. Nunca uses datos reales de la licorería.

## Forma de trabajar
- Una tarea de `docs/TAREAS.md` por sesión. No hagas nada fuera de la tarea.
- Escribe primero las pruebas a partir de los criterios de aceptación y comprueba que fallan. Luego implementa lo mínimo para que pasen.
- Planifica antes de tocar código cuando el cambio afecte más de 3 archivos, el esquema de datos, los permisos o el respaldo. Muestra el plan y espera confirmación.
- Cambios pequeños: unos 5 archivos y 150 líneas nuevas por tarea. Si no caben, propón dividirla.
- No optimices sin medir. Referencia: RNF-PLA-04, 500 ventas por hora con un cajero.
- Si una petición falla por límite de uso, saturación o error del servidor, no reintentes en bucle. Avisa, resume dónde quedaste y detente.
- Trabajo en equipo: una rama por tarea (`feat/T-0XX-nombre`) y un PR por tarea. Se une solo con lint, typecheck, test y build en verde.
- En una rama de tarea no edites `MEMORY.md` ni `docs/TAREAS.md`. Pon el resumen, las decisiones y los errores a evitar en tu respuesta final, y quien integra los pasa a `MEMORY.md`.
- Lee solo lo necesario: el módulo de la tarea, `src/contracts/` y los fakes de los otros módulos. No explores el resto del proyecto.
- Si necesitas algo de otro módulo que el contrato no ofrece, no lo agregues tú. Detente y propón el cambio de contrato.
- Si la persona te pega un paquete de contexto desde un chat web, responde con archivos completos, sin partes omitidas con "...", cada uno con el encabezado `=== ARCHIVO: ruta ===` y su contenido en un bloque de código. Termina con los comandos de verificación.
- Este archivo lo leen opencode y Antigravity. No dependas de funciones propias de una sola herramienta.
- Al terminar, explica en español sencillo qué hiciste, qué archivos tocaste, cómo probarlo y qué queda pendiente.
- Indica qué debe revisar la persona con cuidado: seguridad, casos borde sin manejar y dependencias nuevas. Tu código no se da por bueno sin esa revisión.
- No hagas commits salvo que se pida.

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar. En una rama de tarea no lo edites, sigue la regla de Forma de trabajar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).

## Límites
Siempre:
- Ejecutar lint, typecheck y test antes de dar una tarea por terminada.
- Citar el ID del requisito (RF o RNF) que cubre cada cambio.
- Marcar la tarea en `docs/TAREAS.md` y actualizar `MEMORY.md` al terminar, salvo en una rama de tarea.

Pregunta antes de:
- Agregar dependencias nuevas.
- Crear archivos o carpetas fuera de la estructura descrita.
- Cambiar `src/contracts/` o `docs/CONTRATOS.md`, porque afecta a la otra persona.
- Cambiar el esquema de Dexie o el formato del archivo de respaldo.
- Cambiar la prioridad de un requisito o agregar uno nuevo.
- Dar al Vendedor un permiso que hoy es solo del Dueño.

Nunca:
- Editar `docs/Requerimientos.md`, `docs/REGLAS.md` ni `docs/MODELOS.md` sin que la persona lo pida.
- Importar archivos internos de otro módulo.
- Modificar una versión ya publicada del esquema de Dexie.
- Hacer push directo a `main`.
- Usar float para dinero.
- Desactivar lint o tests para que algo pase.
- Escribir claves, tokens o contraseñas dentro del código.
- Usar `git push --force` ni reescribir el historial.

## Verificación
- Ejecuta `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build`. Los cuatro deben pasar.
- Escribe pruebas que comprueben lo que el sistema hace para el usuario (ejemplo: al vender 2 unidades, el stock baja en 2), no cómo está hecho por dentro.
- Si tocaste ventas o stock, prueba el caso de dos lotes con PEPS de `docs/REGLAS.md` y comprueba que quedan los movimientos registrados.
- Si tocaste permisos, prueba con un Vendedor y confirma que no ve costos ni márgenes.
- Si tocaste el esquema, abre una base creada con la versión anterior y comprueba que la migración conserva los datos.
- Si tocaste la PWA, ejecuta `npm run build` y `npm run preview`, instala la app y pruébala sin conexión desde las herramientas del navegador.
- Si tocaste el respaldo, exporta, importa en una base vacía y comprueba que los datos quedan iguales.
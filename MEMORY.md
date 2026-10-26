# MEMORY.md

## Estado actual
- Proyecto nuevo, sin código. Siguiente tarea: T-001 (docs/TAREAS.md).
- Versiones instaladas: (se anotan al terminar T-001).
- Módulo de referencia de estructura: (se anota al terminar el primer módulo, auth).
- Integrador del equipo: (pendiente de acordar entre las dos personas).

## Decisiones tomadas
- La licorería pidió un sistema local, en un solo dispositivo. Por eso es una PWA sin backend, con los datos en Dexie (IndexedDB) detrás de interfaces de almacenamiento. Así se puede agregar un servidor después sin reescribir las reglas de negocio.
- Se descartó el diseño anterior (NestJS, Prisma y PostgreSQL) porque el sistema es local.
- Roles: solo Dueño y Vendedor. No hay Bodeguero. El dueño designa a los vendedores.
- Dinero en centavos enteros. Vencimiento como fecha sin hora (YYYY-MM-DD).
- Plataformas objetivo: Android, iPhone, iPad y tablets, instalando la PWA desde el navegador.
- Desarrollo en equipo de dos personas, cada una con su agente. Módulos por área de negocio (no micro-módulos), que se hablan solo por los contratos de docs/CONTRATOS.md. Se evita la micro-modularidad extrema porque aumenta el costo de integrar y revisar.
- Un solo archivo de reglas, AGENTS.md, compatible con opencode y Antigravity. Sin GEMINI.md.
- Si se acaban los tokens, se usa el modo chat web de docs/MODELOS.md.

## Pendiente de confirmar con el dueño
- Si necesita ver ventas y reportes desde su propio celular. Si la respuesta es sí, hace falta servidor o sincronización.
- Venta a crédito y cuentas por cobrar (RF-RPT-03): cómo se registran.
- Qué pasa si se intenta vender más que el stock registrado.
- Umbrales de vencimiento por categoría y quién autoriza los precios especiales.

## Hoja de ruta
- Cimientos (Persona 1): T-001, T-002, T-005. En paralelo (Persona 2): T-003, T-004, T-007, T-008, T-009.
- Fase 1: seguridad, usuarios y roles locales (RF-SEG-01 a 04, RNF-PLA-09), más T-015 (contratos en código y fakes).
- Fase 2: inventario (RF-INV-01 a 05). Fase 3: ventas con efectivo y QR (RF-POS-01 a 04).
- Fase 4: caja y turnos (RF-CAJ-01 a 03).
- Fase 5: respaldo y PWA robusta (RNF-PLA-05 y 06). No entregar al dueño sin esta fase.
- Fase 6: compras, proveedores y crédito (RF-COM-01, 03 y 07).
- Fase 7: reportes del dueño (RF-RPT-01 a 04).
- Fase 8: requisitos Should y Could.

## Errores a evitar
- Ninguno registrado todavía.
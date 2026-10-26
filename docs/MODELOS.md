# MODELOS.md - Modelos, herramientas y flujo de trabajo

El catálogo de modelos gratuitos cambia sin aviso. Revisa este archivo cuando algo deje de funcionar. Este archivo es para las personas, no para el agente.

## Roles de los modelos
| Tarea | Modelo | Nota |
| --- | --- | --- |
| Planificar, escribir pruebas y revisar | Nemotron 3 Ultra (Free) | Verificado: fuerte en código y agentes. Úsalo en modo Plan |
| Implementar tareas pequeñas | DeepSeek V4.1 Flash (Free) | Verificado: buen rendimiento en código |
| Respaldo si se acaba la cuota | GLM-5.3-Flash, MiMo-v2.6-Flash, Flint 40B | No verificados. Prueba antes de confiar |
| Mirar bocetos o capturas | Nemotron 3.5 Super VL | Suposición por el nombre: acepta imágenes |
| No usar para programar | Nemotron 3.5 Content Safety, LFM2.5-2.6B | Moderación y modelo muy pequeño |

Regla: quien revisa debe ser de otra familia que quien implementó. Si los modelos son de la otra persona, aplica igual: cada quien revisa el PR del otro con un modelo distinto al que escribió el código.

## Trabajo en equipo
- **Integrador:** una persona (acordada entre las dos) hace los merges, actualiza `MEMORY.md` y `docs/TAREAS.md`, agrega las versiones del esquema de Dexie y las dependencias nuevas.
- **Ramas:** una por tarea (`feat/T-0XX-nombre`), un PR por tarea, merge solo con CI en verde.
- **Contratos:** un cambio de `docs/CONTRATOS.md` se acuerda entre las dos personas y va en un PR aparte.
- **Varios agentes en tu misma computadora:** usa `git worktree` para que cada agente tenga su propia carpeta de trabajo.
- **Antes de empezar una tarea:** `git pull` de `main`, para tener los contratos y fakes al día.
- **Los cupos se suman:** cada persona usa su propia cuota gratuita. Eso acelera, siempre que las tareas sean independientes.

## Herramientas compatibles
Las dos personas pueden usar herramientas distintas sobre el mismo repositorio.

- **opencode:** lee `AGENTS.md`.
- **Antigravity:** según la documentación revisada, también lee `AGENTS.md` del proyecto, y trae Gemini y otros modelos como Claude y GPT-OSS. Los cupos gratuitos de sus modelos no se verificaron.
- **Un solo archivo de reglas:** `AGENTS.md`. No crear `GEMINI.md` ni otros archivos de reglas, porque la precedencia entre ellos no está del todo documentada y habría dos fuentes de verdad.
- **Skills:** Antigravity las lee en `.agents/skills/<nombre>/SKILL.md` dentro del proyecto. Instálalas ahí y comprueba que tu herramienta las detecta. Si opencode no las ve en esa carpeta, copia la skill a la carpeta de skills de opencode.
- **MCP (context7):** la configuración es distinta en cada herramienta, es personal y no se sube al repositorio. Cada persona la configura en la suya.
- **Permisos de comandos:** en Antigravity, deja la ejecución de comandos en modo de pedir aprobación. No uses "Always proceed" mientras el proyecto está en construcción.

## Límites conocidos
- OpenRouter con modelos `:free`: 20 peticiones por minuto y 50 por día (1.000 por día si alguna vez compraste 10 créditos o más). Un agente gasta una petición por paso, así que 50 alcanzan para una sola tarea.
- OpenCode Free: sin cifras verificadas. Si hay saturación, cambia de modelo con `/models`.
- Contexto: puede ser de 128.000 tokens. Una tarea por sesión y `/compact` si la conversación crece.
- Los canales gratuitos pueden usar tus conversaciones para entrenar. Solo datos inventados. Nunca claves.

## Skills
- Siempre: context7 (documentación vigente de librerías) y ponytail (solución mínima).
- Solo al planificar: grill-me, una vez, con Nemotron Ultra en modo Plan.
- Tareas complejas: using-superpowers.
- Solo en tareas de pantallas: impeccable o ui-ux-pro-max. Elige una sola.
- Opcional: caveman en sesiones de implementación. Desactívala cuando quieras explicaciones en español sencillo.
- Evitar: find-skills. Revisa el repositorio de cualquier skill antes de instalarla.

## Cuando se acaban los tokens: modo chat web
Si se acaba la cuota de todos los agentes, se puede seguir usando los modelos desde sus páginas web. El chat no ve tus archivos, así que tú le pasas el contexto y aplicas lo que responda.

1. **Arma el paquete de contexto.** Con la tarea T-009 hecha:
   ```
   npm run context -- T-014 src/features/auth/index.ts src/contracts/index.ts
   ```
   En Fedora puedes copiarlo directo al portapapeles. Instala `wl-clipboard` una vez (`sudo dnf install wl-clipboard`) y usa:
   ```
   npm run context -- T-014 src/features/auth/index.ts | wl-copy
   ```
   Antes de que exista T-009, pega a mano `AGENTS.md`, `MEMORY.md`, el bloque de la tarea, `docs/CONTRATOS.md` y los archivos que la tarea toca.
2. **Mantén el paquete pequeño.** Pasa solo los archivos que la tarea toca. Cada página tiene su propio límite de contexto y de mensajes.
3. **Pega este prompt** seguido del paquete:
   ```
   Eres el agente de programación de este proyecto, pero sin acceso a mi computadora. Te pego el contexto: reglas (AGENTS.md), estado (MEMORY.md), la tarea y los archivos relacionados.

   Haz solo la tarea indicada. Sigue AGENTS.md al pie de la letra.
   Responde así:
   1. Una lista corta de los archivos que creas o modificas.
   2. Cada archivo completo, sin partes omitidas con "...", con el encabezado
      === ARCHIVO: ruta/del/archivo.ts === y su contenido en un bloque de código.
   3. Los comandos que debo ejecutar para comprobar (lint, typecheck, test).
   4. Un resumen de cinco líneas y qué debo revisar.
   Si te falta información, pregúntame antes de escribir código.
   ```
4. **Aplica la respuesta.** Guarda cada archivo en su ruta y ejecuta `npm run lint`, `npm run typecheck` y `npm run test`.
5. **Si algo falla,** pega el error completo en la misma conversación y pide la corrección del archivo completo.
6. **Haz el commit** igual que con un agente, en la rama de la tarea.

El chat web no sabe nada de tu proyecto fuera de lo que pegas. Revisa con más cuidado lo que viene de ahí: es más fácil que invente archivos o funciones que no existen.

## Prompt de una tarea (con agente)
```
Lee AGENTS.md y MEMORY.md.

Tarea: T-0XX (está en docs/TAREAS.md). No hagas nada fuera de esta tarea.

1. Escribe primero las pruebas a partir de los criterios de aceptación y comprueba que fallan por la razón correcta.
2. Implementa lo mínimo para que pasen.
3. Ejecuta lint, typecheck y test. Todo debe pasar. Si algo falla, corrígelo. Si no puedes, detente y explica por qué.
4. No edites MEMORY.md ni docs/TAREAS.md. Dame el resumen, las decisiones y los errores a evitar en tu respuesta final.
5. Resume en cinco líneas qué cambiaste y qué debo revisar. Detente.
```
Si trabajas solo y sin ramas, cambia el punto 4 por: "Actualiza MEMORY.md y marca la tarea como hecha en docs/TAREAS.md".

## Prompt de revisión (otro modelo, sin modificar archivos)
```
Eres revisor. No modifiques archivos. Revisa los cambios del PR (git diff main...HEAD) contra AGENTS.md, docs/CONTRATOS.md y docs/REGLAS.md. Reporta solo problemas reales: errores con dinero o stock, casos borde sin manejar, datos sensibles expuestos, imports de archivos internos de otro módulo, cambios de contrato no acordados, dependencias nuevas y código duplicado. Para cada uno indica archivo, línea y motivo.
```

## Prompt de reanudación (cuando se corta una sesión)
```
Lee AGENTS.md, MEMORY.md y docs/TAREAS.md.

La sesión anterior se cortó. Revisa git status y git diff, y dime qué quedó hecho, qué quedó a medias y qué falta de la tarea en curso. No rehagas lo que ya funciona. Espera mi confirmación antes de continuar.
```

## Rutina por tarea
1. `git pull` de `main`, crea la rama de la tarea y abre una sesión nueva con el modelo elegido.
2. Pega el prompt de la tarea.
3. Al terminar, revisa el resumen y `git diff --stat`.
4. Haz el commit y abre el PR. La otra persona lo revisa con un modelo distinto, o tú mismo con el prompt de revisión.
5. Al cerrar cada fase, prueba el flujo principal a mano en un celular real.
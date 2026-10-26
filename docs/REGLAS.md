# REGLAS.md - Reglas de negocio con ejemplos

Todos los datos son inventados. Los montos están en bolivianos (Bs). En el código se guardan en centavos enteros. De cada ejemplo sale al menos una prueba.

## R-01 Lotes y rotación PEPS (RF-INV-02, RF-INV-06)
El stock de un producto es la suma de sus lotes[cite: 5]. Al vender, se descuenta primero del lote con vencimiento más próximo[cite: 5].

Ejemplo: producto "Cerveza 620 ml".
- Lote A: vence 2026-12-10, 5 unidades.
- Lote B: vence 2026-12-05, 2 unidades.
- Se venden 3 unidades. Salen 2 del lote B y 1 del lote A.
- Resultado: lote B queda en 0, lote A en 4, stock total pasa de 7 a 4.
- Se crean dos movimientos de venta, uno por lote.

## R-02 Lotes vencidos (RF-INV-03, RF-INV-05)
Un lote con vencimiento anterior a la fecha de hoy no se ofrece para vender[cite: 5]. Si todo el stock restante está en lotes vencidos, la venta falla con `INSUFFICIENT_STOCK`[cite: 5].

Ejemplo: hoy es 2026-12-06. El lote B (vence 2026-12-05) no se vende. El lote A sí.

## R-03 Alerta de próximos a vencer (RF-INV-04)
Cada categoría tiene un umbral en días[cite: 5]. Valores por defecto: Cervezas (30 días), Vinos/Licores (60 días), Otros (30 días). Solo el Dueño puede modificar este umbral.

Ejemplo: categoría "Cervezas" con umbral de 30 días. Hoy es 2026-11-20 y un lote vence el 2026-12-10. Faltan 20 días, entra en alerta. Un lote que vence el 2027-02-01 no.

## R-04 Venta sin stock suficiente
Si la cantidad solicitada supera el stock disponible (lotes no vencidos), la venta se rechaza completamente. No se realizan ventas parciales automáticas.
Mensaje de error: "Stock insuficiente. Quedan X unidades y quieres vender Y. Revisa el inventario o pide un ajuste al dueño."[cite: 5]

Ejemplo: stock 7, venta de 8. Mensaje: "Stock insuficiente. Quedan 7 unidades y quieres vender 8. Revisa el inventario o pide un ajuste al dueño."

## R-05 Cobro en efectivo y vuelto (RF-POS-03)
Vuelto = recibido menos total[cite: 5]. Si el recibido es menor al total, no se permite cobrar[cite: 5].

Ejemplos:
- Total Bs 87,50 (8750 centavos). Recibido Bs 100,00. Vuelto Bs 12,50.
- Total Bs 87,50. Recibido Bs 80,00. Error: "Falta Bs 7,50 para completar el cobro."

## R-06 Merma y baja de vencidos (RF-INV-05)
Una merma descuenta unidades de un lote, exige un motivo y calcula la pérdida con el costo de ese lote. Es un movimiento que no se edita ni se borra.

Ejemplo: se dan de baja 2 unidades de un lote con costo de Bs 8,00 cada una, motivo "vencido". Pérdida: Bs 16,00 (1600 centavos).

## R-07 Costo, ganancia y margen (RF-RPT-02)
Cada lote guarda el costo con el que ingresó. El costo de una venta es el costo del lote del que salió. Margen = (precio menos costo) dividido entre el precio. Solo el Dueño ve estos datos.

Ejemplo: precio Bs 15,00 y costo Bs 9,00. Ganancia Bs 6,00. Margen 40%.

## R-08 Caja por turno y arqueo (RF-CAJ-01, RF-CAJ-02, RF-CAJ-03)
Solo se puede vender con una caja abierta[cite: 5]. Si el dinero contado difiere del esperado (`differenceCents !== 0`), la explicación es estrictamente obligatoria[cite: 5].

Ejemplo:
- Fondo inicial Bs 200,00. Ventas en efectivo Bs 1.350,00. Gastos pagados Bs 45,00.
- Esperado: 200 + 1350 - 45 = Bs 1.505,00.
- Contado: Bs 1.495,00. Diferencia: Bs -10,00 (faltante). Se exige explicación.

## R-09 Relevo de turno (RF-CAJ-04)
El vendedor saliente cierra su caja con arqueo. El entrante abre la suya con un fondo igual al efectivo contado que se le traspasa.

## R-10 Ventas a crédito y precios especiales (Fase 8)
Las ventas a crédito (RF-RPT-03) y los precios especiales para clientes frecuentes (RF-POS-05) se implementarán conceptualmente en la Fase 8. Por ahora, toda venta requiere pago inmediato (efectivo o QR)[cite: 3].

Ejemplo: compra de Bs 2.000,00 el 2026-11-01 a 30 días. Vence el 2026-12-01. Se paga Bs 500,00. Saldo: Bs 1.500,00.

## Pendientes por definir con el dueño
- Cómo se registra una venta a crédito y las cuentas por cobrar (RF-RPT-03).
- Valores de umbral de vencimiento por categoría.
- Quién autoriza un precio especial y cómo se aplica (RF-POS-05).
- Qué hacer cuando se vende más que el stock registrado (R-04).

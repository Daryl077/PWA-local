**Matriz de requisitos funcionales de inventario**

| **ID** | **Requisito** | **Prioridad** |
| --- | --- | --- |
| RF-INV-01 | Catálogo centralizado de productos con precio, costo, categoría y stock mínimo | Must |
| RF-INV-02 | Existencias en tiempo real con descuento automático en cada venta | Must |
| RF-INV-03 | Registro de fecha de vencimiento por lote en el ingreso de mercadería | Must |
| RF-INV-04 | Alertas de productos próximos a vencer con umbral configurable por categoría | Must |
| RF-INV-05 | Registro de mermas y baja de vencidos con motivo y valor de la pérdida | Must |
| RF-INV-06 | Indicación de rotación PEPS por producto y lote al vender y reponer | Should |
| RF-INV-07 | Conteo físico cíclico asistido por celular para el dueño | Should |

**Matriz de requisitos funcionales de punto de venta**

| **ID** | **Requisito** | **Prioridad** |
| --- | --- | --- |
| RF-POS-01 | Registro de cada venta por producto en el celular del cajero | Must |
| RF-POS-02 | Búsqueda rápida con botones de favoritos y venta en mínimos toques | Must |
| RF-POS-03 | Cobro en efectivo con cálculo automático de vuelto | Must |
| RF-POS-04 | Cobro por QR con confirmación de comprobante en pantalla | Must |
| RF-POS-05 | Precios especiales para clientes frecuentes autorizados por el dueño | Should |
| RF-POS-06 | Constancia digital de la venta en pantalla, sin impresión | Could |

**Matriz de requisitos funcionales de caja, turnos y efectivo**

| **ID** | **Requisito** | **Prioridad** |
| --- | --- | --- |
| RF-CAJ-01 | Apertura y cierre de caja por turno con fondo inicial | Must |
| RF-CAJ-02 | Arqueo de cierre con conteo, diferencia y explicación | Must |
| RF-CAJ-03 | Registro de gastos pequeños pagados desde la caja | Must |
| RF-CAJ-04 | Relevo de turno con traspaso y caja por vendedor | Should |

**Matriz de requisitos funcionales de compras, proveedores y devoluciones**

| **ID** | **Requisito** | **Prioridad** |
| --- | --- | --- |
| RF-COM-01 | Directorio de proveedores con contactos y canal de pedido | Must |
| RF-COM-02 | Registro de órdenes de compra enviadas y su estado | Should |
| RF-COM-03 | Ingreso de mercadería con verificación de cantidad, estado y lote | Must |
| RF-COM-04 | Registro de devoluciones y cambios con proveedores | Should |
| RF-COM-05 | Punto de reorden sugerido por producto | Should |
| RF-COM-06 | Historial de precios de compra por producto y proveedor | Could |
| RF-COM-07 | Compras a crédito: condiciones de pago, saldos y vencimientos por proveedor | Must |

**Matriz de requisitos funcionales de reportes y visibilidad del dueño**

| **ID** | **Requisito** | **Prioridad** |
| --- | --- | --- |
| RF-RPT-01 | Resumen diario de ventas por turno y vendedor | Must |
| RF-RPT-02 | Ganancias y márgenes por producto y período, solo para el dueño | Must |
| RF-RPT-03 | Estado de cuentas por cobrar con antigüedad de saldos | Must |
| RF-RPT-04 | Reporte de mermas y vencimientos del período | Must |
| RF-RPT-05 | Tablero de consulta móvil del dueño en cualquier horario | Should |
| RF-RPT-06 | Exportación de datos para el contador externo | Could |

**Matriz de requisitos funcionales de seguridad, usuarios y roles**

| **ID** | **Requisito** | **Prioridad** |
| --- | --- | --- |
| RF-SEG-01 | Usuarios individuales con contraseña para cada persona | Must |
| RF-SEG-02 | Perfil Vendedor: registro de ventas, caja de su turno y consulta de existencias | Must |
| RF-SEG-03 | Gestión de vendedores: el dueño crea, activa y desactiva los usuarios vendedores | Must |
| RF-SEG-04 | Perfil Dueño: precios, ajustes, inventario, compras, informes y administración remota | Must |
| RF-SEG-05 | Bitácora mínima de operaciones sensibles (recomendación del analista) | Could |

**Matriz de requisitos no funcionales de plataforma**

| **ID** | **Requisito** | **Prioridad** |
| --- | --- | --- |
| RNF-PLA-01 | Operación íntegra en teléfono celular, sin computadora | Must |
| RNF-PLA-02 | Usabilidad operable por personal sin experiencia en POS | Must |
| RNF-PLA-03 | Disponibilidad continua para operación y consulta 24/7 | Must |
| RNF-PLA-04 | Rendimiento en pico: hasta 500 ventas por hora con un cajero | Must |
| RNF-PLA-05 | Tolerancia a desconexión con sincronización diferida | Must |
| RNF-PLA-06 | Respaldo automático y protección contra pérdida de información | Should |
| RNF-PLA-07 | Escalabilidad de 500 a 2.000 productos sin degradación | Should |
| RNF-PLA-08 | Costo mensual bajo, sin inversión inicial de infraestructura | Should |
| RNF-PLA-09 | Seguridad de acceso: contraseñas, bloqueo rápido y sesiones por turno | Should |

## Nota de arquitectura: sistema local en un solo dispositivo

La licorería pidió que el sistema sea local, en un único dispositivo del local. Esto cambia el alcance de varios requisitos. Los textos de las tablas no se modificaron. Esta es la interpretación que se usa en el proyecto, pendiente de confirmar con el dueño:

- **RNF-PLA-01:** la app corre en celulares y tablets Android, iPhone y iPad, instalada desde el navegador como PWA.
- **RNF-PLA-03:** la disponibilidad depende del dispositivo del local. No hay acceso remoto 24/7.
- **RNF-PLA-05:** todo funciona sin internet. No hay sincronización porque no hay servidor.
- **RNF-PLA-06:** el respaldo es semiautomático: exportar un archivo y recordatorio diario para enviarlo fuera del dispositivo.
- **RNF-PLA-08:** mejora, porque no hay costo de servidor.
- **RF-RPT-05 y RF-SEG-04 (administración remota):** el dueño consulta y administra desde el dispositivo del local. Verlo desde su propio celular queda fuera del alcance inicial.
- **RF-SEG-01 a 04:** la protección de contraseñas y roles es local. Los datos están en el dispositivo, así que el control de acceso tiene límites.

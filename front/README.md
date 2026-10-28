# 🌸 熊猫理财 El Panda Ahorrador — Frontend Angular

Aplicación Frontend desarrollada en **Angular 19** con estética pastel femenina, tipografías manuscritas y redondeadas (Caveat & Comfortaa), y gráficos interactivos con Chart.js.

## Características
- **Página de Presentación (Landing)**: Explicación de la app y tarjeta decorativa con las 8 categorías y sus colores pasteles asignados.
- **Gestión de Años**: Creación de un año con selección de mes inicial (creación automática de meses hasta diciembre).
- **Dashboard Anual**: Tabla resumen consolidad (Ingresos, Gastos, Ahorros, Fijos, Restante con sus propios colores) + Gráfico de barras evolutivo y desglose por categorías.
- **Agenda de Mes con Pestañas**:
  - `📅 Calendario`: Grid mensual interactivo con etiquetas coloreadas y popups de info por gasto.
  - `💰 Ingresos`: Registro de ingresos y monto asignado al ahorro mensual.
  - `📊 Resumen`: Desglose semanal por categorías y totales finales.
  - `🎯 Retos`: Reto mensual aleatorio con grid interactivo de días y contador de progreso.
- **Detalle de Semana**: Comparativa entre Presupuesto vs Real Gastado + Registro de Gastos Extra + Totales por categoría al final de la semana.

## Ejecución en Desarrollo
```bash
npm install
ng serve
```
La aplicación abrirá en `http://localhost:4200/`.

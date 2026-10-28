# 🐼 熊猫理财 El Panda Ahorrador — Backend API

Backend en Node.js y Express estructurado por capas para la aplicación de seguimiento de gastos anuales.

## Arquitectura por Capas
- `src/controllers`: Manejo de peticiones y respuestas HTTP.
- `src/services`: Lógica de negocio y reglas de dominio.
- `src/repositories`: Consultas e interacción directa con MySQL.
- `src/models`: Definición conceptual de las entidades de dominio.
- `src/interfaces`: Contratos e interfaces TypeScript/JS de datos.
- `src/dtos`: Objetos de transferencia de datos y validaciones.
- `src/config`: Configuración de base de datos, logger y entorno.
- `src/middlewares`: Interceptores de peticiones, logs y manejo global de errores.

## Requisitos de Ejecución
1. Node.js >= v18
2. Instalar dependencias: `npm install`
3. Inicializar esquema de base de datos: `npm run init-db`
4. Ejecutar en desarrollo: `npm run dev`

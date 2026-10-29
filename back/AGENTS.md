# 🐼 Backend (`back/`) — Contexto y Reglas para el Agente

> **Regla de mantenimiento:** Cualquier cambio en rutas, middlewares, servicios, repositorios o base de datos dentro de `back/` **debe** reflejarse en este archivo y en [`.agents/skills/progress-tracker/SKILL.md`](../.agents/skills/progress-tracker/SKILL.md).

---

## 1. Estructura de Directorios

```text
back/
├── database/                      # Esquema SQL e historial de migraciones SQL
│   ├── schema.sql                 # Tablas base del sistema y seeds de categorías/retos
│   ├── auth-migration.sql         # Tablas roles, users, user_shares y columna years.user_id
│   ├── user-categories-migration.sql
│   ├── payment-methods-migration.sql
│   ├── add-payment-method.sql
│   ├── fix-years-unique.sql       # UNIQUE(user_id, year) en tabla years
│   └── fix-categories-null.sql
├── src/
│   ├── app.js                     # Configuración de Express, CORS, rutas, healthcheck y SPA fallback
│   ├── server.js                  # Entrypoint HTTP (listen 0.0.0.0) + Graceful Shutdown (SIGTERM/SIGINT)
│   ├── config/
│   │   ├── environment.js         # Carga y validación estricta de variables de entorno (fail-fast)
│   │   ├── database.js            # Pool MySQL2 (connectionLimit=4, keepAlive, dateStrings=true)
│   │   └── logger.js              # Logger Winston (consola + back/logs/error.log y combined.log)
│   ├── middlewares/
│   │   ├── auth.middleware.js             # Verifica JWT Bearer y adjunta req.user
│   │   ├── role.middleware.js             # RBAC: authorize(...roles)
│   │   ├── ownership.middleware.js        # Resuelve req.effectiveUserId y req.isViewer (?viewAs=)
│   │   ├── resource-ownership.middleware.js # Anti-IDOR: assertOwnership(resourceType, getId, { write })
│   │   ├── request-logger.middleware.js   # Log HTTP con método, ruta, status y duración (ms)
│   │   └── error-handler.middleware.js    # Manejador centralizado de errores
│   ├── routes/                    # Definición de endpoints (*.routes.js)
│   ├── controllers/               # Orquestación HTTP (*.controller.js)
│   ├── services/                  # Lógica de negocio (*.service.js)
│   ├── repositories/              # Consultas SQL parametrizadas (*.repository.js)
│   │   └── ownership.repository.js # Resolución del user_id propietario para cada entidad
│   ├── utils/
│   │   └── date-helpers.js        # Cálculo de semanas calendario, días del mes y rangos en America/Bogota
│   └── scripts/                   # Scripts de inicialización, migración y pruebas de propiedad
└── Dockerfile                     # Imagen de producción (node:20-alpine, CMD ["node", "src/server.js"])
```

---

## 2. Reglas Obligatorias del Backend

### Regla 1 — Cadena de Seguridad y Propiedad (Anti-IDOR)
Todo endpoint que opere sobre datos de un usuario debe aplicar los middlewares en este orden:
1. `authenticate`: valida el JWT y pobla `req.user = { id, email, role }`.
2. `resolveOwnership`: determina sobre qué usuario se consulta/opera y pobla `req.effectiveUserId` y `req.isViewer` (si es un `viewer` o un `admin` usando `?viewAs=`).
3. `authorize('admin', 'regular')` (en rutas de escritura) o `{ write: true }` en `assertOwnership`.
4. `assertOwnership(resourceType, getId, { write })`:
   - Tipos soportados por `ownership.repository.js`: `'year'`, `'month'`, `'week'`, `'income'`, `'saving'`, `'budgetExpense'`, `'extraExpense'`, `'monthChallenge'`.
   - Si el recurso no existe o pertenece a otro usuario distinto de `req.effectiveUserId` (y no es `admin`), responde **`404 { success: false, message: 'Recurso no encontrado' }`**.
   - Si al actualizar un gasto o ingreso cambia su `date` o `month_id`, el servicio **también** verifica que el nuevo `month_id` pertenezca a `effectiveUserId`.

### Regla 2 — Uso de `req.effectiveUserId` en Controladores
- Nunca uses `req.user.id` directamente para consultar o crear recursos financieros cuando la ruta pasa por `resolveOwnership`; usa siempre `const userId = req.effectiveUserId || req.user.id`.

### Regla 3 — Conexión a Base de Datos (`mysql2/promise`)
- Importar siempre el pool desde `src/config/database.js`.
- **Todas** las consultas deben usar placeholders `?` (`db.query('SELECT ... WHERE id = ?', [id])`). Prohibido interpolar variables del usuario en strings SQL.
- **Límite de conexiones:** el plan de CleverCloud permite máximo 5 conexiones simultáneas por usuario; `DB_CONNECTION_LIMIT` por defecto es `4`. No crear pools adicionales fuera de `database.js`.

### Regla 4 — Formato de Respuesta Estándar y Errores
- Respuestas exitosas:
  ```json
  { "success": true, "data": { ... }, "message": "Opcional" }
  ```
- Errores controlados en servicios: lanzar un error con `statusCode` y `message` (o `AppError` tras la Fase 1) y capturarlo en el controlador con `next(error)`.

### Regla 5 — Logging
- Usar `src/config/logger.js` (`logger.info`, `logger.warn`, `logger.error`, `logger.debug`) con prefijo del componente, por ejemplo: `[ExpenseService] ...`.
- No commitear archivos `.log` de `back/logs/`.

---

## 3. Comandos Útiles

```bash
cd back
npm run dev                  # Servidor en desarrollo con nodemon (src/server.js)
npm start                    # Servidor en producción (node src/server.js)
node src/scripts/test-ownership.js # Prueba de verificación de reglas de propiedad / anti-IDOR
```

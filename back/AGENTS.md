# 🐼 Backend (`back/`) — Contexto y Reglas para el Agente

> **Regla de mantenimiento:** Cualquier cambio en rutas, middlewares, servicios, repositorios o base de datos dentro de `back/` **debe** reflejarse en este archivo y en [`.agents/skills/progress-tracker/SKILL.md`](../.agents/skills/progress-tracker/SKILL.md).

---

## 1. Estructura de Directorios

```text
back/
├── database/                      # Esquema SQL e historial de migraciones SQL
│   ├── migrations/
│   │   ├── 001-refresh-tokens.sql # Tabla refresh_tokens (token_hash SHA-256, family_id, expires_at, revoked_at)
│   │   └── 002-must-change-password.sql # Columna users.must_change_password BOOLEAN NOT NULL DEFAULT FALSE
│   ├── schema.sql                 # Tablas base del sistema y seeds de categorías/retos
│   ├── auth-migration.sql         # Tablas roles, users, user_shares y columna years.user_id
│   ├── user-categories-migration.sql
│   ├── payment-methods-migration.sql
│   ├── add-payment-method.sql
│   ├── fix-years-unique.sql       # UNIQUE(user_id, year) en tabla years
│   └── fix-categories-null.sql
├── src/
│   ├── app.js                     # Configuración de Express, trust proxy, Helmet, CORS, rate-limit, rutas y SPA fallback
│   ├── server.js                  # Entrypoint HTTP (listen 0.0.0.0) + Graceful Shutdown (SIGTERM/SIGINT)
│   ├── config/
│   │   ├── environment.js         # Carga y validación estricta de variables de entorno (fail-fast)
│   │   ├── database.js            # Pool MySQL2 (connectionLimit=4, keepAlive, dateStrings=true)
│   │   └── logger.js              # Logger Winston + helpers maskEmail / maskEmailsInText
│   ├── middlewares/
│   │   ├── request-id.middleware.js       # Genera/propaga req.id (UUID) y cabecera X-Request-Id
│   │   ├── rate-limit.middleware.js       # Rate limiters (login IP+email, register, refresh y global /api)
│   │   ├── auth.middleware.js             # Verifica JWT Bearer (typ==='access'), carga usuario con caché 60s y bloquea con 403 PASSWORD_CHANGE_REQUIRED si must_change_password=TRUE
│   │   ├── role.middleware.js             # RBAC: authorize(...roles)
│   │   ├── ownership.middleware.js        # Resuelve req.effectiveUserId y req.isViewer (?viewAs=)
│   │   ├── validate.middleware.js         # Validación de esquemas Zod: validate({ body, params, query }) -> 400 con detalle por campo
│   │   ├── resource-ownership.middleware.js # Anti-IDOR: assertOwnership(resourceType, getId, { write })
│   │   ├── request-logger.middleware.js   # Log HTTP con reqId, método, ruta, status, duración y userId (sin emails)
│   │   └── error-handler.middleware.js    # Manejador centralizado (AppError, Multer, CORS, 500 oculto + requestId)
│   ├── validators/                # Esquemas Zod por módulo (common, auth, profile, year, month, week, income, saving, expense, challenge, category, payment-method, share, admin, summary)
│   ├── routes/                    # Definición de endpoints (*.routes.js)
│   ├── controllers/               # Orquestación HTTP (*.controller.js)
│   ├── services/                  # Lógica de negocio (*.service.js)
│   ├── repositories/              # Consultas SQL parametrizadas (*.repository.js)
│   │   └── ownership.repository.js # Resolución del user_id propietario para cada entidad
│   ├── utils/
│   │   ├── app-error.js           # Clase AppError(statusCode, message, code) para errores operacionales
│   │   └── date-helpers.js        # Cálculo de semanas calendario, días del mes y rangos en America/Bogota
│   └── scripts/                   # Scripts de inicialización, migración y pruebas (ownership y seguridad base)
└── Dockerfile                     # Imagen de producción (node:20-alpine, CMD ["node", "src/server.js"])
```

---

## 2. Reglas Obligatorias del Backend

### Regla 1 — Cadena de Seguridad y Propiedad (Anti-IDOR)
Todo endpoint que opere sobre datos de un usuario debe aplicar los middlewares en este orden:
1. `authenticate`: valida el JWT y pobla `req.user = { id, email, role }`.
2. `resolveOwnership`: determina sobre qué usuario se consulta/opera y pobla `req.effectiveUserId` y `req.isViewer` (si es un `viewer` o un `admin` usando `?viewAs=`).
3. `authorize('admin', 'regular')` (en rutas de escritura) o `{ write: true }` en `assertOwnership`.
4. `validate({ body, params, query })`: valida y transforma `req.body`, `req.params` y `req.query` con esquemas `zod` (de `src/validators/`). Si falla, responde `400 { success: false, message: 'Datos inválidos', errors: [{ field, message }] }`.
5. `assertOwnership(resourceType, getId, { write })`:
   - Tipos soportados por `ownership.repository.js`: `'year'`, `'month'`, `'week'`, `'income'`, `'saving'`, `'budgetExpense'`, `'extraExpense'`, `'monthChallenge'`.
   - Si el recurso no existe o pertenece a otro usuario distinto de `req.effectiveUserId` (y no es `admin`), responde **`404 { success: false, message: 'Recurso no encontrado' }`**.
   - Si al actualizar un gasto o ingreso cambia su `date` o `month_id`, el servicio **también** verifica que el nuevo `month_id` pertenezca a `effectiveUserId` y que la fecha (`YYYY-MM-DD`) caiga dentro del año/mes indicado (`400` si no corresponde).

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
- Errores controlados en servicios/controladores: lanzar siempre `throw new AppError(statusCode, message, code)` (importado de `src/utils/app-error.js`) y capturarlo en el controlador con `next(error)`. Prohibido lanzar objetos literales `throw { statusCode, message }`.
- Errores 5xx o no operacionales devuelven `{ "success": false, "message": "Error interno del servidor", "requestId": "..." }` sin exponer detalles SQL ni `err.stack` fuera de `development`.

### Regla 5 — Logging y Privacidad (PII)
- Usar `src/config/logger.js` (`logger.info`, `logger.warn`, `logger.error`, `logger.debug`) con prefijo del componente, por ejemplo: `[ExpenseService] ...`.
- **Prohibido registrar emails en texto plano en nivel `info`**: usar `userId` o enmascarar con `logger.maskEmail(email)` (`j***@dominio.com`).
- No commitear archivos `.log` de `back/logs/`.

---

## 3. Comandos Útiles

```bash
cd back
npm run dev                        # Servidor en desarrollo con nodemon (src/server.js)
npm start                          # Servidor en producción (node src/server.js)
npm run test:ownership             # Prueba de verificación de propiedad / anti-IDOR
npm run test:security              # Prueba de Helmet, Rate Limit, AppError, RequestId y ocultamiento 500
npm run test:auth                  # Prueba de Refresh Tokens (cookie httpOnly, rotación, familias, caché 60s)
npm run test:prompt7               # Prueba de categorías, gastos (category_id/payment_method), must_change_password y adminUpdateUser
npm run test:prompt8               # Prueba de validación Zod por campo y correspondencia fecha-mes en gastos/ingresos
```

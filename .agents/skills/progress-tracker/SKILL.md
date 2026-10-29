---
name: progress-tracker
description: >-
  Estado vivo del desarrollo y hoja de ruta de El Panda Ahorrador. Consultar al
  iniciar una sesión para saber en qué fase va el proyecto y actualizar al
  terminar cualquier tarea o corrección.
---

# 📊 Seguimiento de Progreso del Proyecto (Progress Tracker)

**Última actualización:** 2026-10-28

> **Instrucción para el agente:** Al finalizar cualquier tarea, mueve los ítems correspondientes entre secciones (`🟢 Completado`, `🔴 En Progreso / Próximo Paso`, `🟡 Backlog`) y registra la fecha.

---

## 🟢 Completado

### Fase 0 — Contención y Seguridad Crítica (Completada el 2026-10-28)
- [x] **Prompt 1 (Git y Secretos):**
  - Repositorio Git inicializado y conectado a `origin/main`.
  - `.gitignore` raíz configurado (excluye `.env`, `back/logs/`, `back/uploads/`, `front/dist/`, `front/.angular/`, `*.tsbuildinfo`).
  - `back/.env.example` limpiado con placeholders y `front/.env.example` creado.
  - `back/src/config/environment.js` valida variables obligatorias al arranque (fail-fast) y elimina secretos hardcodeados en producción.
- [x] **Prompt 2 (CORS, Pool MySQL, `server.js` y Health Check):**
  - CORS restringido estrictamente a `allowedOrigins` en `back/src/app.js`.
  - Pool MySQL ajustado a `connectionLimit: 4` (`DB_CONNECTION_LIMIT`), con `enableKeepAlive` y `maxIdle`.
  - Separación entre `back/src/app.js` y `back/src/server.js` con *graceful shutdown* (`SIGTERM`/`SIGINT`).
  - `GET /api/health` verifica conectividad real a MySQL (`SELECT 1` con timeout de 3s) y reporta `version` y `uptime`.
  - `Dockerfile` multi-etapa unificado en la raíz del proyecto.
- [x] **Prompt 3 (Anti-IDOR en Escrituras):**
  - Creado `back/src/repositories/ownership.repository.js` y `back/src/middlewares/resource-ownership.middleware.js` (`assertOwnership`).
  - Protegidas todas las rutas de escritura (`incomes`, `expenses` budget/extra/series, `challenges/progress`, `years`, `categories`, `payment-methods`).
  - Verificación de propiedad del nuevo `month_id` cuando cambia la fecha de un gasto o ingreso.
  - Script de verificación `back/src/scripts/test-ownership.js` incluido.
- [x] **Prompt 4 (Anti-IDOR en Lecturas y Defensa en Profundidad):**
  - Protegidas todas las rutas `GET` por ID (`years`, `months`, `weeks`, `incomes`, `challenges`, `summary`).
  - Filtrado por `userId` en repositorios (`year.repository`, `month.repository`, `expense.repository`, `summary.repository`, `week.repository`).
  - Corregido bug en `summary.repository.getAnnualSummary` cuando una consulta devuelve filas vacías (`Cannot read properties of undefined (reading 'total')`).
- [x] **Sistema de Memoria del Proyecto:**
  - Creados `AGENTS.md`, `back/AGENTS.md`, `front/AGENTS.md` y las 4 skills en `.agents/skills/`.

### Fase 1 — Seguridad Base (Completada el 2026-10-28)
- [x] **Prompt 5 (Helmet, Rate Limiting, `AppError`, `X-Request-Id` y Privacidad en Logs):**
  - Instalados `helmet` y `express-rate-limit` en `back/`.
  - Configurado `app.set('trust proxy', 1)`, `app.use(helmet())` y `express.json({ limit: '100kb' })` en `back/src/app.js`.
  - Implementados rate limiters en `back/src/middlewares/rate-limit.middleware.js`: `/api/auth/login` (5/15m por IP+email en minúsculas), `/api/auth/register` (5/1h por IP), `/api/auth/refresh` (30/15m) y global `/api` (300/15m) con respuesta `429`.
  - Creada clase `AppError` en `back/src/utils/app-error.js` y migrados todos los `throw { statusCode, message }` del backend.
  - Reescrito `error-handler.middleware.js` junto con `request-id.middleware.js` (`X-Request-Id`), manejo de `MulterError` (`LIMIT_FILE_SIZE` → `400`), `CORS` (`403`) y ocultamiento de detalles/stack en errores 500.
  - Eliminado registro de emails en texto plano en nivel `info` en `request-logger`, repositorios, servicios y controladores usando `userId` y `logger.maskEmail` (`j***@dominio.com`).
- [x] **Prompt 6 (Refresh Tokens Opacos, Rotación por Familias, Cookie `httpOnly`, Caché de Usuario 60s y Cola 401 en Axios):**
  - Creada migración `back/database/migrations/001-refresh-tokens.sql` (`refresh_tokens`: `id`, `user_id` FK CASCADE, `token_hash` CHAR(64) UNIQUE, `family_id` CHAR(36), `expires_at`, `revoked_at`, `created_at`, `user_agent`, `ip`, `INDEX(user_id)`).
  - Separado criptográficamente el Access Token (`JWT_ACCESS_SECRET`, `typ: 'access'`, payload `{ sub, role }`, `15m`) del Refresh Token (64 bytes aleatorios con `crypto.randomBytes`, hash SHA-256 en BD, enviado en cookie `httpOnly`, `Secure`/`SameSite=None` en prod y `Lax` en dev, `path=/api/auth`, `maxAge=7d`).
  - Implementada rotación en `POST /api/auth/refresh` y revocación completa de la familia (`family_id`) si se reutiliza un token ya revocado.
  - Creados endpoints `POST /api/auth/logout` y `POST /api/auth/logout-all`, y revocación automática de todos los refresh tokens al cambiar contraseña o desactivar un usuario desde admin.
  - Actualizado `auth.middleware.js` para exigir `typ === 'access'`, cargar el usuario desde BD con caché en memoria de 60 s (`is_active` y rol real desde BD).
  - En el frontend (`front/src/services/api.ts`, `AuthContext.tsx`, `ProtectedRoute.tsx`, `SettingsPage.tsx`): `withCredentials: true`, access token solo en memoria, recuperación inicial de sesión vía `/auth/refresh` con loader, cola de refresh único para 401 concurrentes, eliminación de `panda_access_token`/`panda_refresh_token` de `localStorage`, y botón `"Cerrar sesión en todos los dispositivos"`.
- [x] **Prompt 7 (Reglas de Categorías/Gastos, `must_change_password` en Creación por Admin, Whitelist en `adminUpdateUser` y Normalización de Email/Username):**
  - En `category.service.updateCategory`: bloqueada la edición de categorías globales (`user_id IS NULL`) con `403 "No puedes modificar categorías predeterminadas"` salvo rol `admin`; `404` si pertenece a otro usuario; validación de `name` (≤ 50), `color` (hex `#RRGGBB`) e `icon` (≤ 30, `[a-z0-9- ]`); y verificación de duplicados (`409`) al renombrar.
  - En `expense.service.js` y `recurrence.service.js`: verificado al crear o editar gastos que `category_id` sea global o pertenezca a `effectiveUserId` (`400` en caso contrario) y que `payment_method` pertenezca al usuario o sea `"Retiro de ahorros"` (`400` en caso contrario).
  - En `auth.service.adminCreateUser`: eliminada la contraseña fija `'Temporal123!'`; si no se envía contraseña se genera una aleatoria criptográficamente segura de 16 caracteres que cumple `_validatePasswordStrength` y se devuelve una sola vez en la respuesta; validación de fortaleza si el admin envía contraseña.
  - Creada migración `back/database/migrations/002-must-change-password.sql` (`users.must_change_password BOOLEAN NOT NULL DEFAULT FALSE`), activada en `TRUE` al crear usuarios por admin y limpiada a `FALSE` en `changePassword`.
  - Si `must_change_password` es `TRUE`, el login devuelve el flag, el backend bloquea los demás endpoints con `403` (`code: 'PASSWORD_CHANGE_REQUIRED'`) en `auth.middleware.js`, y el frontend (`ForceChangePasswordPage.tsx`, `ProtectedRoute.tsx`, `LoginPage.tsx`, `api.ts`) redirige a `/change-password`.
  - En `adminUpdateUser` (y `toggleUserStatus`/`adminDeleteUser`): lista blanca explícita (`name`, `email`, `username`, `role`, `isActive`), bloqueo de auto-degradación o auto-desactivación del propio admin y bloqueo para impedir que el sistema quede sin ningún `admin` activo.
  - Normalización y validación de `email` (`trim` + `toLowerCase` + regex) y `username` (`trim`, 3–30 caracteres, `[a-zA-Z0-9_.]`) en `register`, `updateProfile`, `adminCreateUser` y `adminUpdateUser`.
- [x] **Prompt 8 (Validación Centralizada con Zod y Verificación Fecha-Mes):**
  - Instalado `zod` en `back/` y creado `back/src/middlewares/validate.middleware.js` (`validate({ body, params, query })`), que responde `400 { success: false, message: 'Datos inválidos', errors: [{ field, message }] }` y reemplaza `req.body`, `req.params` y `req.query` por los datos parseados y normalizados.
  - Creados los esquemas en `back/src/validators/` (`common`, `auth`, `profile`, `year`, `month`, `week`, `income`, `saving`, `expense`, `challenge`, `category`, `payment-method`, `share`, `admin`, `summary`).
  - Aplicado `validate` en las 14 rutas de `back/src/routes/` y eliminadas las validaciones manuales duplicadas en controladores y servicios manteniendo las reglas de negocio.
  - Agregada verificación en `income.service.js`, `expense.service.js` y `recurrence.service.js` para asegurar que la fecha (`YYYY-MM-DD`) del ingreso o gasto pertenezca al año y mes (`month_id`) indicado (`400` en caso contrario).
  - Creado script de prueba `back/src/scripts/test-prompt8.js` (`npm run test:prompt8`).

---

## 🔴 En Progreso / Próximo Paso: Fase 2 — Estabilidad y Calidad

- [ ] **Prompt 9:** Migraciones versionadas (Knex/Umzug), eliminación de `CREATE TABLE` en runtime (`payment-method` y `recurrence`), índices faltantes, FK `years.user_id` y transacciones SQL (`withTransaction`) en `createYear` y `recurrence.service`.

---

## 🟡 Backlog

### Fase 2 — Estabilidad y Calidad
- [ ] **Prompt 9:** Migraciones versionadas (Knex/Umzug), eliminación de `CREATE TABLE` en runtime (`payment-method` y `recurrence`), índices faltantes, FK `years.user_id` y transacciones SQL (`withTransaction`) en `createYear` y `recurrence.service`.
- [ ] **Prompt 10:** Unificación de zona horaria (`America/Bogota`) en back y front (`todayISO`, `parseISODate`), y normalización numérica de montos `DECIMAL` (eliminar `parseFloat(... as any)`).
- [ ] **Prompt 11:** Almacenamiento externo de avatares (Cloudinary), validación de *magic bytes* y optimización a WebP 256×256 sin EXIF con `sharp`.
- [ ] **Prompt 12:** Alinear endpoints de `ShareManagementPage` y `auth.service.ts` con `/api/share/*` y `/api/admin/*`, selector de propietario activo (`?viewAs=`) para usuarios `viewer` en el Navbar y modo solo lectura en la UI (`useCanEdit`).
- [ ] **Prompt 13:** Suite de tests automatizados (Jest + Supertest en back; Vitest + Testing Library en front), ESLint/Prettier y pipeline CI en GitHub Actions + Dependabot.
- [ ] **Prompt 14:** Integración con Sentry, logs JSON en producción, workflow diario de backups cifrados de MySQL, cabeceras de seguridad en Nginx y endurecimiento de Dockerfiles.

### Fase 3 — Refactor y Limpieza
- [ ] **Prompt 15:** Migrar fetching a TanStack Query, dividir componentes monolíticos (`MonthLayoutPage.tsx`, `WeekDetailPage.tsx`, `NotificationsModal.tsx`), formularios con `react-hook-form` + `zod`, `React.lazy` por ruta y modales accesibles.
- [ ] **Prompt 16:** Eliminar archivos residuales de la etapa Angular (`front/.angular/`, `src/environments/`, `src/styles.scss`, `src/index.html`), deduplicar `logo.png` y favicons, y activar `noUnusedLocals`/`noUnusedParameters`.

---

## 🐛 Deuda Técnica y Bugs Conocidos Pendientes de Fase 1–3
1. **Pantalla "Compartir" en Frontend (`front/src/services/auth.service.ts`):** Apunta a rutas antiguas (`/share/viewers`, `/share/owners`, `/users`) en vez de `/share/my-viewers`, `/share/shared-with-me` y `/admin/users` (se corrige en Prompt 12).
2. **Desfase horario después de las 19:00 en Colombia:** `shortcuts.service.js` y `toISOString().split('T')[0]` en el front usan UTC en lugar de `America/Bogota` (se corrige en Prompt 10).
3. **Avatares en almacenamiento efímero:** `uploads/avatars` vive en el disco del contenedor (se corrige en Prompt 11).
4. **Restos de Angular en `front/`:** Existen archivos sin usar de cuando el proyecto era Angular 19 (se limpian en Prompt 16).

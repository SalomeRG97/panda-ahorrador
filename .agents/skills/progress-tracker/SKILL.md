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

### Fase 1 — Seguridad Base (En curso)
- [x] **Prompt 5 (Helmet, Rate Limiting, `AppError`, `X-Request-Id` y Privacidad en Logs):**
  - Instalados `helmet` y `express-rate-limit` en `back/`.
  - Configurado `app.set('trust proxy', 1)`, `app.use(helmet())` y `express.json({ limit: '100kb' })` en `back/src/app.js`.
  - Implementados rate limiters en `back/src/middlewares/rate-limit.middleware.js`: `/api/auth/login` (5/15m por IP+email en minúsculas), `/api/auth/register` (5/1h por IP), `/api/auth/refresh` (30/15m) y global `/api` (300/15m) con respuesta `429`.
  - Creada clase `AppError` en `back/src/utils/app-error.js` y migrados todos los `throw { statusCode, message }` del backend.
  - Reescrito `error-handler.middleware.js` junto con `request-id.middleware.js` (`X-Request-Id`), manejo de `MulterError` (`LIMIT_FILE_SIZE` → `400`), `CORS` (`403`) y ocultamiento de detalles/stack en errores 500.
  - Eliminado registro de emails en texto plano en nivel `info` en `request-logger`, repositorios, servicios y controladores usando `userId` y `logger.maskEmail` (`j***@dominio.com`).

---

## 🔴 En Progreso / Próximo Paso: Fase 1 — Seguridad Base

- [ ] **Prompt 6:** Separación criptográfica entre Access Token y Refresh Token, tabla `refresh_tokens` con rotación y revocación por familias, cookie `httpOnly`, endpoints `/api/auth/logout` y `/api/auth/logout-all`, y cola de refresh único en el interceptor Axios del frontend.
- [ ] **Prompt 7:** Reglas de negocio en categorías (bloquear edición de globales a no-admin, validar hex/icono y pertenencia de `category_id` al crear gastos), eliminar contraseña fija `'Temporal123!'` en creación por admin y agregar flujo `must_change_password`.
- [ ] **Prompt 8:** Validación centralizada de entrada con `zod` (`validate.middleware.js` y esquemas en `back/src/validators/`).

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

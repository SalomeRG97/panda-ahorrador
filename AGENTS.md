# 🐼🌸 El Panda Ahorrador — Memoria y Contexto Maestro del Proyecto

> **REGLA DE ORO (ACTUALIZACIÓN OBLIGATORIA):**
> Este sistema de memoria es la fuente de verdad viva del repositorio. **Cada vez que un agente o desarrollador realice un cambio de arquitectura, agregue/modifique endpoints, tablas, variables de entorno, flujos de negocio o complete una tarea**, **DEBE** actualizar en el mismo commit:
> 1. Este archivo (`AGENTS.md`) o los específicos de capa (`back/AGENTS.md`, `front/AGENTS.md`) si cambia la estructura, el stack o las convenciones.
> 2. `.agents/skills/progress-tracker/SKILL.md` con lo completado, lo que queda en progreso o nuevos hallazgos.
> 3. `.agents/skills/decision-log/SKILL.md` si se tomó una decisión técnica o de diseño relevante.
> 4. `.agents/skills/deploy-runbook/SKILL.md` si cambia la operación, variables de entorno o despliegue.

---

## 🗺️ Mapa del Sistema de Memoria

| Archivo | Propósito |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Contexto global del negocio, arquitectura, modelo de datos, API y operación. |
| [`back/AGENTS.md`](./back/AGENTS.md) | Reglas, capas, seguridad anti-IDOR y comandos del Backend (Node.js + Express). |
| [`front/AGENTS.md`](./front/AGENTS.md) | Reglas, estructura, estado y convenciones del Frontend (React 18 + Vite + TS). |
| [`DOCUMENTATION.md`](./DOCUMENTATION.md) | Documentación técnica extendida (diagramas ER, secuencias E2E y detalle de tablas). |
| [`.agents/skills/progress-tracker/SKILL.md`](./.agents/skills/progress-tracker/SKILL.md) | Estado vivo del proyecto (Completado, En progreso, Backlog, Deuda técnica). |
| [`.agents/skills/decision-log/SKILL.md`](./.agents/skills/decision-log/SKILL.md) | Registro histórico de decisiones de arquitectura (ADR) y su "por qué". |
| [`.agents/skills/deploy-runbook/SKILL.md`](./.agents/skills/deploy-runbook/SKILL.md) | Manual de operación, despliegue en Render/Docker, monitoreo y respuesta a incidentes. |
| [`.agents/skills/new-feature/SKILL.md`](./.agents/skills/new-feature/SKILL.md) | Guía paso a paso para construir nuevas funcionalidades respetando seguridad y capas. |

---

## 1. ¿Qué es este proyecto?

**El Panda Ahorrador (熊猫理财)** es una aplicación web full-stack de **finanzas personales y planificación presupuestaria anual, mensual y semanal**, diseñada con una estética kawaii/pastel inspirada en una agenda física japonesa (*Kakebo*).

Permite a los usuarios:
- Crear su **año financiero** (eligiendo el mes de inicio, generando automáticamente meses, semanas calendario y retos de ahorro mensuales).
- Registrar **ingresos mensuales** y definir una **meta de ahorro mensual**.
- Planificar **gastos presupuestados** (fijos o variables, individuales o en **series recurrentes** semanales/quincenales/mensuales/anuales) y compararlos contra el **monto real gastado**.
- Registrar **gastos extra** no planeados por semana y mes, asociando **categorías** (globales o personalizadas por usuario) y **medios de pago** (incluyendo el medio especial reservado `"Retiro de ahorros"`, que descuenta del ahorro en vez del ingreso disponible).
- Cumplir **retos diarios de ahorro** mes a mes, recibir **alertas de gastos pendientes/vencidos** y compartir sus finanzas en modo **solo lectura** con usuarios observadores (`viewer`).

---

## 2. Stack Tecnológico Completo

| Capa | Tecnología | Detalles clave |
|---|---|---|
| **Frontend** | React 18.3 + TypeScript 5.5 + Vite 5.4 | SPA con `react-router-dom` v6, Context API (`AuthContext`, `ToastContext`), `axios`, `chart.js` + `react-chartjs-2`, estilos CSS/Glassmorphism. |
| **Backend** | Node.js 20+ + Express 4.21 (CommonJS) | Arquitectura en 4 capas (`routes` → `controllers` → `services` → `repositories`). |
| **Base de Datos** | MySQL 8 (CleverCloud) | Driver `mysql2/promise` con pool de conexiones limitado (`DB_CONNECTION_LIMIT=4` por límite de 5 conexiones del plan gratuito de CleverCloud). |
| **Autenticación** | JWT (`jsonwebtoken`) + `bcryptjs` + `cookie-parser` | Access Token en memoria (`15m`, `typ: 'access'`) + Refresh Token opaco de 64 bytes en cookie `httpOnly` (`7d`, hash SHA-256 en BD con rotación y familias), hash bcrypt de 12 rondas, RBAC (`admin`, `regular`, `viewer`). |
| **Logging** | Winston 3.17 | Consola coloreada + archivos locales en `back/logs/` (`combined.log`, `error.log`). |
| **Infraestructura** | Docker + Render | `Dockerfile` multi-etapa en la raíz (compila el front en `/app/front/dist` y lo sirve desde Express en el puerto `3000`), además de Dockerfiles individuales por carpeta. |

---

## 3. Modelo de Dominio y Reglas de Negocio Esenciales

1. **Jerarquía temporal y de propiedad (`Ownership`):**
   - Todo dato financiero pertenece a un usuario a través de la raíz `years.user_id`.
   - Cadena de propiedad:
     `users (1) ──< years (1) ──< months (1) ──< weeks / incomes / savings / budget_expenses / extra_expenses / month_challenges ──< challenge_progress`.
   - Además, `categories` (cuando `user_id IS NOT NULL`), `payment_methods` y `expense_recurrences` tienen `user_id` directo.
2. **Roles (`RBAC`) y Compartición (`user_shares`):**
   - `admin`: gestiona usuarios (`/api/admin/*`) y puede inspeccionar recursos o usar `?viewAs=<userId>`.
   - `regular`: propietario de sus datos financieros; puede compartir acceso de lectura con usuarios de rol `viewer`.
   - `viewer`: acceso **exclusivamente de lectura** a los datos de los usuarios `regular` que le hayan compartido acceso (resuelto en `req.effectiveUserId` y bloqueado para escritura con `403`).
3. **Fórmula Financiera Mensual:**
   - $\text{Total Ingresos} = \sum \text{incomes.amount}$
   - $\text{Gastos del Ingreso} = \sum \text{gastos cuyo medio de pago} \neq \text{"Retiro de ahorros"}$
   - $\text{Retiros de Ahorro} = \sum \text{gastos cuyo medio de pago} = \text{"Retiro de ahorros"}$
   - $\text{Ahorro Neto del Mes} = \text{savings.amount} - \text{Retiros de Ahorro}$
   - $\text{Disponible Restante} = \text{Total Ingresos} - \text{savings.amount} - \text{Gastos del Ingreso}$
   - En gastos presupuestados, cuando `real_amount` ya fue registrado se usa `real_amount` para el gasto real; mientras está pendiente (`real_amount IS NULL`), equivale a pendiente de pago y activa notificaciones en la campana del Navbar.
4. **Recurrencia de Gastos (`expense_recurrences`):**
   - Un gasto presupuestado puede crearse con frecuencia (`weekly`, `biweekly`, `monthly`, `yearly`, etc.) y materializarse automáticamente en los meses/semanas del año activo y de nuevos años creados.
   - Las ediciones y eliminaciones de gastos recurrentes soportan alcance (`scope`): `'single'` (solo este), `'future'` (este y siguientes) o `'all'` (toda la serie).

---

## 4. Modelos de Datos Principales (MySQL)

| Tabla | Clave / FK | Descripción |
|---|---|---|
| `roles` | `id` PK | Catálogo de roles: `1=admin`, `2=regular`, `3=viewer`. |
| `users` | `id` PK, `role_id` FK | Usuarios registrados (`email`, `username`, `password_hash`, `is_active`, `avatar_url`). |
| `refresh_tokens` | `id` PK, `user_id` FK | Sesiones de refresco (`token_hash` SHA-256 UNIQUE, `family_id` UUID, `expires_at`, `revoked_at`, `user_agent`, `ip`). |
| `user_shares` | `owner_id`, `viewer_id` FK | Relación de compartición de datos de un `regular` hacia un `viewer`. |
| `years` | `id` PK, `user_id` FK | Año financiero de un usuario (`year`, `start_month`, `end_month`). Unique `(user_id, year)`. |
| `months` | `id` PK, `year_id` FK | Meses generados para el año (`month_number` 1–12, `month_name`). |
| `weeks` | `id` PK, `month_id` FK | Semanas calendario del mes (`week_number`, `start_date`, `end_date`). |
| `incomes` | `id` PK, `month_id` FK | Ingresos del mes (`date`, `concept`, `amount`). |
| `savings` | `id` PK, `month_id` UNIQUE | Meta/monto de ahorro apartado en el mes (`amount`). |
| `categories` | `id` PK, `user_id` NULL/FK | Categorías globales (`user_id IS NULL`) y personalizadas por usuario (`name`, `color`, `icon`). |
| `payment_methods` | `id` PK, `user_id` FK | Medios de pago del usuario (Efectivo, Nequi, Tarjeta, etc.). `"Retiro de ahorros"` es reservado. |
| `budget_expenses` | `id` PK, `month_id`, `week_id`, `category_id`, `recurrence_id` | Gastos planeados (`date`, `concept`, `budget_amount`, `real_amount` nullable, `payment_method`). |
| `extra_expenses` | `id` PK, `month_id`, `week_id`, `category_id` | Gastos no presupuestados (`date`, `concept`, `amount`, `payment_method`). |
| `expense_recurrences`| `id` PK, `user_id` FK | Reglas de serie recurrente (`frequency`, `start_date`, `end_date`, `budget_amount`). |
| `challenges` | `id` PK | Catálogo global de retos de ahorro mensuales. |
| `month_challenges` | `id` PK, `month_id`, `challenge_id` | Reto asignado a un mes específico. |
| `challenge_progress`| `id` PK, `month_challenge_id` | Checklist diario (`day` 1–31, `completed` boolean). |

---

## 5. Catálogo de Rutas / Endpoints Principales (`/api`)

| Módulo | Ruta Base | Endpoints clave y protección |
|---|---|---|
| **Health** | `/api/health` | `GET /` — Verifica conexión a MySQL (`SELECT 1` con timeout 3s), retorna versión y uptime. |
| **Auth** | `/api/auth` | `POST /register`, `POST /login`, `POST /refresh` (cookie `httpOnly`), `POST /logout`, `POST /logout-all` (`authenticate`), `GET /me` (`authenticate`). |
| **Perfil** | `/api/profile` | `GET /`, `PUT /`, `PUT /password`, `POST /avatar` (subida con `multer`). |
| **Admin** | `/api/admin` | `GET/POST /users`, `PUT/DELETE /users/:id`, `PUT /users/:id/status`, `GET /roles` (`authorize('admin')`). |
| **Share** | `/api/share` | `POST /`, `DELETE /:viewerId`, `GET /my-viewers`, `GET /shared-with-me`. |
| **Años** | `/api/years` | `GET /`, `GET /:id`, `POST /`, `DELETE /:id` (`resolveOwnership` + `assertOwnership('year')`). |
| **Meses** | `/api/months` | `GET /year/:yearId`, `GET /:id` (`resolveOwnership` + `assertOwnership`). |
| **Semanas** | `/api/weeks` | `GET /month/:monthId`, `GET /:id` (`resolveOwnership` + `assertOwnership`). |
| **Ingresos** | `/api/incomes` | `GET /month/:monthId`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /saving` (`assertOwnership`). |
| **Gastos** | `/api/expenses` | `GET /pending`, `POST/PUT/DELETE /budget/:id`, `DELETE /budget/:id/series`, `POST/PUT/DELETE /extra/:id` (`assertOwnership`). |
| **Categorías** | `/api/categories` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` (protege categorías globales y valida propietario). |
| **Medios Pago**| `/api/payment-methods` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` (aislado por `effectiveUserId`). |
| **Retos** | `/api/challenges` | `GET /`, `GET /month/:monthId`, `PUT /progress` (`assertOwnership('monthChallenge')`). |
| **Resúmenes** | `/api/summary` | `GET /year/:yearId`, `GET /year/:yearId/categories`, `GET /month/:monthId/categories-weekly`. |
| **Atajos** | `/api/shortcuts` | `GET /today` — Devuelve año, mes, semana y reto correspondientes a la fecha actual del usuario. |

---

## 6. Variables de Entorno Críticas

### Backend (`back/.env`)
| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No (default `3000`) | Puerto donde escucha el servidor Express. |
| `NODE_ENV` | Recomendada | `development` o `production`. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | **Sí (Fatal si falta)** | Credenciales MySQL (CleverCloud). La app aborta el arranque (`process.exit(1)`) si falta alguna. |
| `DB_CONNECTION_LIMIT` | No (default `4`) | **Crítico mantener en `≤ 4`** en el plan gratuito de CleverCloud (límite duro de 5 conexiones por usuario). |
| `JWT_ACCESS_SECRET` | **Sí (Fatal si falta)** | Secreto para firmar tokens de acceso. (En `development` acepta `JWT_SECRET` como fallback con warning). |
| `JWT_REFRESH_SECRET` | **Sí (Fatal si falta)** | Secreto para firmar tokens de refresco. |
| `JWT_ACCESS_EXPIRES_IN` | No (default `15m`) | Tiempo de vida del access token. |
| `JWT_REFRESH_EXPIRES_IN`| No (default `7d`) | Tiempo de vida del refresh token. |
| `CLIENT_URL` | Sí en prod | Orígenes permitidos por CORS (puede ser lista separada por comas). |

### Frontend (`front/.env`)
| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base del API (ej. `http://localhost:3000/api` en local, `/api` en contenedor unificado, o URL de Render). |

---

## 7. Convenciones de Código y Seguridad

1. **Prohibido consultas SQL sin verificar propiedad (Anti-IDOR):**
   - Toda ruta que reciba un ID (`:id`, `:yearId`, `:monthId`, `body.month_id`, `body.monthChallengeId`) **DEBE** pasar por `authenticate` → `resolveOwnership` → `assertOwnership(resourceType, getId, { write })`.
   - Si un recurso pertenece a otro usuario, se responde **`404 Recurso no encontrado`** (nunca `403`, para no revelar la existencia de IDs ajenos).
   - Además, los servicios y repositorios filtran por `userId` (`effectiveUserId`) como defensa en profundidad.
2. **Separación de capas en Backend:**
   - `routes/*.routes.js`: definición de endpoints y cadena de middlewares.
   - `controllers/*.controller.js`: extrae `req.params/body/effectiveUserId` y devuelve `{ success: true, data }`.
   - `services/*.service.js`: lógica de negocio y validaciones.
   - `repositories/*.repository.js`: consultas SQL parametrizadas (`?`) usando `db.query`.
3. **Separación `app.js` / `server.js`:**
   - `back/src/app.js` configura Express y exporta `app` (sin abrir puerto, facilitando tests).
   - `back/src/server.js` inicia `app.listen` en `0.0.0.0` y gestiona el *graceful shutdown* (`SIGTERM`/`SIGINT`) cerrando HTTP y el pool MySQL.
4. **Moneda y Fechas:**
   - La moneda del sistema es Peso Colombiano (`COP`), formateada con `formatCurrency` (`Intl.NumberFormat('es-CO')`).
   - Las fechas de negocio se manejan en formato ISO local `YYYY-MM-DD` (zona horaria de referencia `America/Bogota`).

---

## 8. Flujo de Operación y Despliegue Resumido

- **Desarrollo local:**
  - Backend: `cd back && npm run dev` (puerto `3000`).
  - Frontend: `cd front && npm run dev` (puerto `4200`, con proxy `/api` → `localhost:3000`).
- **Producción (Render / Docker):**
  - El `Dockerfile` de la raíz ejecuta un build multi-etapa: compila el frontend de React (`front/dist`) y lo empaca junto al backend de Express (`back/`), que sirve tanto `/api/*` como los archivos estáticos de la SPA en un único contenedor o en servicios separados (`front/Dockerfile` con Nginx + `back/Dockerfile`).
  - Consulta todos los procedimientos operativos, monitoreo y respuesta a incidentes en [`.agents/skills/deploy-runbook/SKILL.md`](./.agents/skills/deploy-runbook/SKILL.md).

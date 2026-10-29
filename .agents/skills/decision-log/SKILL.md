---
name: decision-log
description: >-
  Registro histórico de decisiones de arquitectura (ADR) de El Panda Ahorrador.
  Consultar antes de proponer cambios estructurales y actualizar cada vez que se
  tome una decisión de diseño, seguridad, base de datos o infraestructura.
---

# 🏛️ Registro de Decisiones de Arquitectura (Decision Log)

> **Instrucción para el agente:** Cuando tomes o implementes una decisión técnica importante con el usuario, añade una entrada al inicio de este archivo siguiendo el formato `[YYYY-MM-DD] Título`.

---

## [2026-10-28] Validación Centralizada de Entrada con Zod (`validate.middleware.js`) y Coherencia Fecha-Mes
- **Decisión:**
  1. Incorporar `zod` en `back/` con el middleware `validate({ body, params, query })` (`back/src/middlewares/validate.middleware.js`) que parsea y normaliza los datos de entrada antes de ejecutar `assertOwnership` y los controladores, respondiendo `400 { success: false, message: 'Datos inválidos', errors: [{ field, message }] }` ante cualquier error de formato.
  2. Centralizar las primitivas comunes en `back/src/validators/common.validator.js`: `id` (`z.coerce.number().int().positive()` con rechazo de `null`/`''`/booleanos), `date` (`YYYY-MM-DD` con validación real de calendario y años bisiestos), `money` (`0` a `999_999_999_999`, máximo 2 decimales) y `concept` (`trim`, 1 a 255 caracteres).
  3. Mantener compatibilidad transparente con las variantes de nombres de campo enviadas por el frontend (`month_id` / `monthId`, `monthChallengeId` / `month_challenge_id`, `email` / `viewerEmail`) normalizándolas en el esquema.
  4. Validar en la capa de servicios (`income.service.js`, `expense.service.js`, `recurrence.service.js`) que la fecha (`YYYY-MM-DD`) de todo ingreso o gasto caiga dentro del año y mes correspondientes al `month_id` indicado (`400` si no coincide).
- **Por qué:** Eliminar validaciones manuales dispersas o inconsistentes entre controladores y servicios, evitar que cadenas gigantescas, montos negativos, fechas inexistentes (`2026-02-30`) o IDs no numéricos lleguen a las consultas SQL, e impedir que se registren gastos/ingresos con fechas de otro mes distinto al contenedor `month_id`.
- **Consecuencia:** Toda ruta nueva en `back/src/routes/` debe declarar su esquema en `back/src/validators/` e invocar `validate(...)` en la cadena de middlewares.

---

## [2026-10-28] Endurecimiento de Reglas de Negocio: Categorías/Medios en Gastos, `must_change_password` en Creación por Admin y Protección de Último Admin
- **Decisión:**
  1. En `category.service.updateCategory`: prohibir a usuarios no-admin modificar categorías globales (`user_id IS NULL`) devolviendo `403`, devolver `404` si la categoría pertenece a otro usuario, validar formato de `name` (≤ 50), `color` (`#RRGGBB`) e `icon` (≤ 30, `[a-z0-9- ]`), y verificar duplicados (`409`) al renombrar.
  2. En `expense.service.js` y `recurrence.service.js`: validar al crear o actualizar gastos que `category_id` sea global o pertenezca a `effectiveUserId` y que `payment_method` pertenezca al usuario o sea `"Retiro de ahorros"` (`400` en caso contrario).
  3. Eliminar la contraseña por defecto `'Temporal123!'` en `adminCreateUser`, generando una contraseña aleatoria criptográficamente segura de 16 caracteres (`crypto.randomInt`) devuelta una sola vez, y marcar `users.must_change_password = TRUE` (migración `002-must-change-password.sql`).
  4. Bloquear en `auth.middleware.js` cualquier endpoint distinto de `PUT /api/profile/password`, `GET /api/auth/me` y `POST /api/auth/logout(-all)` con `403` (`code: 'PASSWORD_CHANGE_REQUIRED'`) mientras `must_change_password` sea `TRUE`, redirigiendo en el frontend a `/change-password` (`ForceChangePasswordPage.tsx`).
  5. Aplicar lista blanca explícita (`name`, `email`, `username`, `role`, `isActive`) en `adminUpdateUser`, impedir que un admin se quite el rol o se desactive a sí mismo, y garantizar que nunca quede el sistema con 0 administradores activos.
- **Por qué:** Evitar que un usuario altere categorías globales compartidas por todos, asocie gastos a categorías/medios de pago ajenos, deje cuentas creadas por admin con una contraseña estática conocida o deje el sistema bloqueado sin administradores activos.
- **Consecuencia:** Todo usuario creado por un administrador debe cambiar su contraseña en su primer inicio de sesión antes de operar en la plataforma.

---

## [2026-10-28] Refresh Tokens Opacos con Rotación por Familias (`refresh_tokens`), Cookie `httpOnly` y Access Token en Memoria
- **Decisión:**
  1. Firmar los Access Tokens con `JWT_ACCESS_SECRET`, payload `{ sub: id, role, typ: 'access' }` y expiración de `15m`, almacenándolos únicamente en memoria en el frontend (`front/src/services/api.ts`).
  2. Reemplazar los Refresh Tokens JWT por tokens opacos de 64 bytes aleatorios (`crypto.randomBytes(64)`), almacenando solo su hash SHA-256 (`CHAR(64)`) en la tabla `refresh_tokens` con identificador de familia (`family_id`) y entregándolos en una cookie `httpOnly` (`path=/api/auth`, `maxAge=7d`, `SameSite=None; Secure` en producción y `SameSite=Lax` en desarrollo).
  3. Rotar el refresh token en cada llamada a `POST /api/auth/refresh` y, si se detecta la reutilización de un token previamente revocado, revocar inmediatamente toda la familia (`family_id`).
  4. Validar `typ === 'access'` en `auth.middleware.js` y consultar el estado (`is_active`) y el rol del usuario en la BD con una caché en memoria de 60 s (invalidada de inmediato en eventos de cambio de contraseña, `logout-all` o desactivación por admin).
  5. Serializar las respuestas `401` concurrentes en el interceptor de Axios mediante una única promesa de refresh en vuelo y una cola de reintentos.
- **Por qué:** Antes ambos tokens se firmaban con el mismo secreto y vivían en `localStorage` (vulnerables a robo por XSS, sin posibilidad de revocación y permitiendo usar un access token como refresh).
- **Consecuencia:** Ningún token de acceso o refresco se guarda en `localStorage`; los usuarios desactivados pierden acceso en ≤ 60 s y cualquier intento de reutilizar un refresh token rotado invalida toda la sesión.

---

## [2026-10-28] Endurecimiento HTTP con Helmet, Rate Limiting, `AppError`, `X-Request-Id` y Enmascarado de PII en Logs
- **Decisión:**
  1. Activar `helmet()`, `app.set('trust proxy', 1)` y `express.json({ limit: '100kb' })` en `back/src/app.js`.
  2. Configurar `express-rate-limit` con políticas diferenciadas: `/api/auth/login` (5/15m por IP+email en minúsculas), `/api/auth/register` (5/h por IP), `/api/auth/refresh` (30/15m) y global `/api` (300/15m).
  3. Estandarizar errores operacionales con `AppError(statusCode, message, code)` y trazabilidad por petición mediante `X-Request-Id` (`crypto.randomUUID()`), ocultando mensajes internos/SQL y `err.stack` en errores 5xx cuando `NODE_ENV !== 'development'`.
  4. Enmascarar direcciones de correo (`j***@dominio.com`) o usar `userId` en logs de nivel `info`.
- **Por qué:** Mitigar ataques de fuerza bruta sobre credenciales, ataques DoS por payloads grandes, filtración de estructura SQL/stacktraces al cliente e inclusión de datos personales (PII) en archivos de log.
- **Consecuencia:** Todo error controlado en servicios o controladores debe instanciar `AppError` y ningún log `info` debe imprimir emails completos sin pasar por `logger.maskEmail`.

---

## [2026-10-28] Sistema de Memoria Persistente en el Repositorio (`AGENTS.md` + `.agents/skills/`)
- **Decisión:** Incorporar un sistema de memoria viva directamente en el repositorio (`AGENTS.md`, `back/AGENTS.md`, `front/AGENTS.md` y 4 skills en `.agents/skills/`).
- **Por qué:** Garantizar que cualquier desarrollador o agente de IA entienda de inmediato qué hace el proyecto, cómo está construido, cómo se opera y en qué estado va, evitando regresiones entre sesiones.
- **Consecuencia:** Cada cambio en código, rutas, esquema de BD o despliegue obliga a actualizar los archivos de memoria en el mismo commit.

---

## [2026-10-28] Mitigación Centralizada Anti-IDOR con `assertOwnership` y Defensa en Profundidad
- **Decisión:** Crear `ownership.repository.js` y el middleware `assertOwnership(resourceType, getId, { write })` en `resource-ownership.middleware.js`, además de filtrar por `userId` (`effectiveUserId`) en servicios y repositorios.
- **Por qué:** En la auditoría inicial se detectó que aunque `resolveOwnership` calculaba `req.effectiveUserId`, los endpoints consultaban o modificaban recursos únicamente por su `id` primario, permitiendo acceso horizontal (IDOR) entre usuarios.
- **Consecuencia:**
  - Toda ruta nueva o existente que reciba un ID de recurso debe incluir `authenticate`, `resolveOwnership` y `assertOwnership`.
  - Cuando un recurso no pertenece a `req.effectiveUserId` (y el usuario no es `admin`), la API devuelve **`404 Recurso no encontrado`** en lugar de `403` para no filtrar la existencia de IDs secuenciales.
  - Los usuarios `viewer` son bloqueados con `403` en cualquier operación con `{ write: true }`.

---

## [2026-10-28] Validación Estricta de Entorno, CORS Cerrado y Ajuste del Pool MySQL (`DB_CONNECTION_LIMIT=4`)
- **Decisión:**
  1. Eliminar secretos JWT por defecto en producción y fallar rápido (`process.exit(1)`) en `environment.js` si faltan variables críticas.
  2. Restringir CORS estrictamente a `allowedOrigins` (`localhost:4200`, `localhost:3000`, `RENDER_EXTERNAL_URL`, `CLIENT_URL`).
  3. Reducir `connectionLimit` del pool MySQL de `10` a `4` (configurable vía `DB_CONNECTION_LIMIT`) y separar `app.js` de `server.js` con cierre ordenado (`SIGTERM`/`SIGINT`).
- **Por qué:**
  - El plan de MySQL en CleverCloud tiene un límite duro de `max_user_connections = 5`; tener `connectionLimit: 10` saturaba el servidor y bloqueaba peticiones.
  - Separar `app.js` de `server.js` permite ejecutar pruebas de integración sin abrir puertos y liberar conexiones al apagar el contenedor en Render.
- **Consecuencia:** No deben crearse conexiones sueltas fuera del pool único, y en producción siempre deben definirse `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`.

---

## [2026-10-28] Despliegue Docker Unificado (Multi-Stage React + Express)
- **Decisión:** Crear un `Dockerfile` en la raíz que compila el frontend (`front/dist`) en la primera etapa y lo sirve desde Express (`back/src/app.js`) en la segunda etapa, manteniendo además los `Dockerfile` individuales en `back/` y `front/`.
- **Por qué:** Simplificar el despliegue en plataformas PaaS como Render bajo un solo servicio web y un mismo origen (`/api` + SPA), reduciendo problemas de CORS y costos de infraestructura.
- **Consecuencia:** `back/src/app.js` sirve estáticos de `../../front/dist` si la carpeta existe y redirige rutas no-API (`!* /api`, `!* /uploads`) a `index.html`.

---

## [2026-08] Modelo de Compartición de Datos (`regular` → `viewer`) y Medio Reservado `"Retiro de ahorros"`
- **Decisión:**
  - Implementar tres roles (`admin`, `regular`, `viewer`) y la tabla `user_shares` para que un usuario `regular` comparta la vista de sus finanzas con observadores (`viewer`).
  - Reservar el medio de pago `"Retiro de ahorros"` como inmutable por usuario.
- **Por qué:**
  - Permitir que parejas, familiares o asesores visualicen el presupuesto sin riesgo de alterar registros.
  - Diferenciar contablemente los gastos pagados con el ingreso corriente del mes frente a los gastos cubiertos tomando dinero del ahorro acumulado.
- **Consecuencia:** Los cálculos de resumen mensual y anual descuentan los gastos con `"Retiro de ahorros"` del bolsón de ahorro (`savings.amount`) y no del ingreso disponible del mes.

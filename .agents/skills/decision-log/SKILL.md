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

---
name: deploy-runbook
description: >-
  Manual de operación, despliegue, monitoreo y respuesta a incidentes (Runbook)
  de El Panda Ahorrador. Consultar para desplegar a producción, configurar
  variables de entorno, ejecutar diagnósticos o atender incidentes.
---

# 🚀 Manual de Operación y Despliegue (Deploy & Operations Runbook)

> **Instrucción para el agente:** Si agregas una variable de entorno, un script de migración o cambias un Dockerfile/pipeline, actualiza inmediatamente este runbook.

---

## 1. Arquitectura de Ambientes

| Ambiente | Frontend | Backend API | Base de Datos |
|---|---|---|---|
| **Desarrollo Local** | Vite Dev Server (`http://localhost:4200`) con proxy `/api` | Node + Nodemon (`http://localhost:3000`) | MySQL local o MySQL CleverCloud Dev |
| **Producción (Unificado)** | Compilado en `/app/front/dist` y servido por Express | Render Web Service (`Dockerfile` raíz, puerto `3000` en `0.0.0.0`) | MySQL 8 en CleverCloud (`max_user_connections = 5`) |
| **Producción (Separado)** | Render Static/Docker (`front/Dockerfile` con Nginx puerto `80`) | Render Web Service (`back/Dockerfile` puerto `3000`) | MySQL 8 en CleverCloud |

---

## 2. Variables de Entorno de Producción (Checklist)

### Servicio Backend / Contenedor Unificado
```env
PORT=3000
NODE_ENV=production

# Base de Datos MySQL (CleverCloud)
DB_HOST=<host-clevercloud>
DB_PORT=3306
DB_USER=<usuario-clevercloud>
DB_PASSWORD=<password-rotado>
DB_NAME=<nombre-db>
DB_CONNECTION_LIMIT=4

# Seguridad JWT (generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_ACCESS_SECRET=<secreto-64-bytes-1>
JWT_REFRESH_SECRET=<secreto-64-bytes-2>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS (separar por comas si hay más de un dominio)
CLIENT_URL=https://panda-ahorrador-front.onrender.com
```

### Build del Frontend
- En despliegue **unificado** (`Dockerfile` raíz): `VITE_API_URL=/api` (por defecto en el `Dockerfile`).
- En despliegue **separado** (`front/Dockerfile`): `VITE_API_URL=https://<tu-backend>.onrender.com/api`.

---

## 3. Procedimiento de Despliegue

### 3.1 Checklist Pre-Deploy
- [ ] `cd front && npm run build` compila sin errores de TypeScript (`tsc -b && vite build`).
- [ ] `git status` limpio; no hay archivos `.env`, `logs/` ni credenciales en el commit.
- [ ] Si el cambio incluye alteraciones de esquema SQL, el script de migración fue ejecutado y verificado.
- [ ] Los archivos de memoria (`AGENTS.md`, `progress-tracker`, `decision-log`, `deploy-runbook`) están actualizados.

### 3.2 Despliegue Automático (Render conectado a GitHub)
1. Hacer push a la rama `main`:
   ```bash
   git push origin main
   ```
2. Render detecta el commit y construye la imagen con el `Dockerfile`.
3. Verificar que el servicio levante y responda en `/api/health`.

### 3.3 Verificación Post-Deploy (Smoke Test)
1. **Health Check:**
   ```bash
   curl -i https://<tu-dominio>/api/health
   ```
   Debe responder `HTTP/1.1 200 OK` con `{"status":"ok","db":"ok","version":"1.0.0",...}`.
2. **CORS Check:**
   Verificar desde el navegador que el login funcione sin errores de CORS.
3. **Flujo básico:** Iniciar sesión → Abrir año activo → Consultar mes actual.

---

## 4. Procedimiento de Rollback de Emergencia

1. **En Render:** Ir al Dashboard del servicio → pestaña **Events / Deploys** → localizar el último deploy estable → hacer clic en **Rollback to this deploy**.
2. **En Git:** Si se requiere revertir el código en `main`:
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## 5. Playbook de Respuesta a Incidentes

### Caso A: Error `User has exceeded the 'max_user_connections' resource (current value: 5)`
- **Causa:** El plan gratuito de CleverCloud permite máximo 5 conexiones simultáneas. Puede ocurrir si `DB_CONNECTION_LIMIT > 4` o si hay una instancia local + Render conectadas al mismo tiempo.
- **Acción inmediata:**
  1. Verificar que `DB_CONNECTION_LIMIT=4` (o `3` si se conecta también desde local) esté configurado en Render.
  2. Cerrar procesos locales (`npm run dev`, clientes DBeaver/MySQL Workbench) que estén usando la misma cuenta de BD.
  3. Reiniciar el servicio en Render; el manejador `SIGTERM` en `back/src/server.js` cerrará el pool ordenadamente (`pool.end()`).

### Caso B: `/api/health` devuelve `503` con `"db": "down"`
- **Causa:** Caída o mantenimiento en CleverCloud, o credenciales de BD vencidas/rotadas.
- **Acción inmediata:**
  1. Revisar el estado de CleverCloud y los logs del contenedor (`[HealthCheck] Fallo de conexión a la BD`).
  2. Verificar `DB_HOST`, `DB_USER`, `DB_PASSWORD` en las variables de entorno de Render.

### Caso C: Sospecha de exposición de credenciales o tokens comprometidos
- **Acción inmediata:**
  1. **Base de datos:** Rotar la contraseña del usuario MySQL en el panel de CleverCloud y actualizar `DB_PASSWORD` en Render.
  2. **Sesiones JWT:** Generar nuevos valores para `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` en Render y reiniciar el servicio (esto invalida de inmediato todos los tokens emitidos anteriormente).

---

## 6. Rutina Operativa de Mantenimiento

- **Diario:** Verificar monitor de disponibilidad sobre `GET /api/health` (ej. UptimeRobot cada 5 min).
- **Semanal:** Revisar logs de errores (`500`, `401`, `404` de `ResourceOwnership`) y actualizar dependencias menores.
- **Mensual:** Ejecutar `npm audit` en `back/` y `front/`, revisar espacio utilizado en CleverCloud y probar restauración de respaldo de la base de datos.
- **Trimestral:** Rotar `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`.

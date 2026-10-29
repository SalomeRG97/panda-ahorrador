---
name: new-feature
description: >-
  Guía paso a paso para agregar una nueva funcionalidad de extremo a extremo
  (Base de Datos, Backend Express con seguridad Anti-IDOR y Frontend React+TS)
  en El Panda Ahorrador, incluyendo la actualización obligatoria de la memoria.
---

# 🛠️ Cómo Agregar una Nueva Funcionalidad (New Feature Playbook)

Sigue siempre esta lista en orden para evitar vulnerabilidades (especialmente IDOR) y mantener la coherencia entre Backend, Frontend y Memoria del Proyecto.

---

## Paso 1 — Base de Datos (`back/database/`)
1. Define la tabla o alteración SQL asegurándote de que toda entidad financiera tenga un vínculo claro con su usuario propietario:
   - Directo (`user_id INT NOT NULL` con `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`), o
   - Jerárquico a través de `year_id`, `month_id` o `week_id` (que llegan hasta `years.user_id`).
2. Agrega índices sobre las llaves foráneas y columnas usadas en `WHERE` / `ORDER BY`.

---

## Paso 2 — Propiedad del Recurso / Anti-IDOR (`back/src/repositories/ownership.repository.js`)
1. Si creaste una nueva entidad direccionable por `:id`, añade un método `get<Entidad>OwnerId(id)` en `back/src/repositories/ownership.repository.js` que devuelva el `user_id` propietario (con `JOIN` hasta `years` si aplica).
2. Registra el nuevo `resourceType` en el `switch` de `ownershipRepository.getOwnerId(resourceType, id)`.

---

## Paso 3 — Capas del Backend (`back/src/`)
1. **Repositorio (`back/src/repositories/<modulo>.repository.js`):**
   - Usa consultas parametrizadas (`?`) sobre `db` (`src/config/database.js`).
   - Recibe `userId` (`effectiveUserId`) para filtrar por propietario en las consultas SQL.
2. **Servicio (`back/src/services/<modulo>.service.js`):**
   - Valida reglas de negocio y pertenencia de entidades relacionadas (por ejemplo, si recibe `month_id` o `category_id`, verifica que pertenezcan a `userId`).
3. **Controlador (`back/src/controllers/<modulo>.controller.js`):**
   - Obtén el usuario efectivo con `const userId = req.effectiveUserId || req.user.id;`.
   - Devuelve `{ success: true, data }` y delega errores a `next(error)`.
4. **Rutas (`back/src/routes/<modulo>.routes.js`) y registro en `back/src/app.js`:**
   - En lecturas por ID:
     ```js
     router.get('/:id', authenticate, resolveOwnership, assertOwnership('<entidad>', req => req.params.id), (req, res, next) => controller.getById(req, res, next));
     ```
   - En escrituras:
     ```js
     router.put('/:id', authenticate, resolveOwnership, authorize('admin', 'regular'), assertOwnership('<entidad>', req => req.params.id, { write: true }), (req, res, next) => controller.update(req, res, next));
     ```

---

## Paso 4 — Capas del Frontend (`front/src/`)
1. **Tipos (`front/src/types/index.ts`):**
   - Declara la interfaz TypeScript del modelo y de sus DTOs de creación/edición.
2. **Servicio API (`front/src/services/api.service.ts`):**
   - Agrega los métodos tipados usando la instancia `api` de `front/src/services/api.ts`.
3. **Componentes / Páginas (`front/src/pages/` o `front/src/components/`):**
   - Usa `formatCurrency` para montos en COP.
   - Usa `useToast()` para retroalimentación al usuario.
   - Respeta el rol del usuario (`hasRole('admin', 'regular')` para acciones de escritura).

---

## Paso 5 — Verificación y Actualización de Memoria (Obligatorio)
1. **Compilación y pruebas:**
   - Ejecuta `cd front && npm run build` para verificar tipos TypeScript.
   - Prueba que un usuario B reciba `404` al intentar leer/modificar un recurso creado por el usuario A, y que un `viewer` reciba `403` al intentar escribir.
2. **Actualizar la Memoria del Proyecto en el mismo commit:**
   - [ ] `AGENTS.md` (si agregaste tablas, endpoints o variables de entorno).
   - [ ] `back/AGENTS.md` o `front/AGENTS.md` (si agregaste nuevos módulos/archivos relevantes).
   - [ ] `.agents/skills/progress-tracker/SKILL.md` (mover la tarea a `🟢 Completado`).
   - [ ] `.agents/skills/decision-log/SKILL.md` (si se tomó una decisión de diseño importante).
   - [ ] `DOCUMENTATION.md` (si cambió el diccionario de tablas o el catálogo de endpoints).

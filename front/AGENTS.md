# 🌸 Frontend (`front/`) — Contexto y Reglas para el Agente

> **Regla de mantenimiento:** Cualquier cambio en rutas de React, servicios HTTP, tipos o vistas dentro de `front/` **debe** reflejarse en este archivo y en [`.agents/skills/progress-tracker/SKILL.md`](../.agents/skills/progress-tracker/SKILL.md).

---

## 1. Estructura de Directorios

```text
front/
├── index.html                           # HTML raíz de Vite (fuentes Caveat/Comfortaa + FontAwesome)
├── vite.config.ts                       # Puerto 4200, alias @ -> ./src, proxy /api -> localhost:3000
├── nginx.conf                           # Configuración SPA para contenedor standalone de Nginx
├── Dockerfile                           # Multi-etapa (build con Vite -> Nginx alpine)
└── src/
    ├── main.tsx                         # Punto de montaje React 18
    ├── App.tsx                          # BrowserRouter + AuthProvider + ToastProvider + Rutas
    ├── index.css                        # Sistema de diseño principal (Glassmorphism Panda, variables CSS)
    ├── config/
    │   └── environment.ts               # Exporta API_BASE_URL desde import.meta.env.VITE_API_URL
    ├── context/
    │   ├── AuthContext.tsx              # Estado global de sesión (auto-refresh inicial con loader, logout y logoutAll)
    │   └── ToastContext.tsx             # Notificaciones emergentes (success, error, warning, info)
    ├── components/
    │   ├── PaymentMethodSelect.tsx      # Selector reutilizable de medios de pago
    │   └── common/
    │       ├── Navbar.tsx               # Barra superior, accesos rápidos de "Hoy" y campana de alertas
    │       ├── NotificationsModal.tsx   # Modal de gastos presupuestados pendientes/vencidos
    │       ├── RecurrenceScopeModal.tsx # Selector de alcance ('single' | 'future' | 'all') en series
    │       ├── ProtectedRoute.tsx       # Guardia de navegación por autenticación y rol
    │       ├── ModalPortal.tsx          # Portal React para modales sobre document.body
    │       └── ChineseDecoration.tsx    # Decoración visual temática
    ├── pages/
    │   ├── auth/                        # LoginPage.tsx, RegisterPage.tsx
    │   ├── landing/                     # LandingPage.tsx (inicio, accesos directos al día/semana/mes actual)
    │   ├── years/                       # YearListPage.tsx, YearDashboardPage.tsx (gráficos Chart.js)
    │   ├── months/                      # MonthLayoutPage.tsx (tabs: Calendario, Ingresos, Presupuesto, Extra, Resumen, Retos)
    │   ├── weeks/                       # WeekDetailPage.tsx (presupuesto vs real semanal + gastos extra)
    │   ├── settings/                    # SettingsPage.tsx (perfil, contraseña, avatar, categorías, medios de pago)
    │   ├── share/                       # ShareManagementPage.tsx (compartir finanzas con viewers)
    │   └── admin/                       # UserManagementPage.tsx (CRUD administrativo de usuarios)
    ├── services/
    │   ├── api.ts                       # Instancia Axios (withCredentials: true), accessToken en memoria y cola única de refresh en 401
    │   ├── api.service.ts               # Cliente de negocio (años, meses, semanas, gastos, ingresos, retos, resumen)
    │   ├── auth.service.ts              # Cliente de autenticación, perfil, admin y compartición
    │   └── email.service.ts             # Servicio auxiliar de correo (pendiente de migrar al backend)
    ├── types/
    │   └── index.ts                     # Interfaces TypeScript de todas las entidades y DTOs
    └── utils/
        └── formatters.ts                # formatCurrency(value) en formato COP ($ 0)
```

> **Nota sobre archivos heredados:** El proyecto nació originalmente en Angular 19 y fue migrado a React 18 + Vite. Aún existen algunos archivos residuales (`src/environments/`, `src/styles.scss`, `src/index.html`) que no forman parte del flujo de compilación de Vite y están programados para eliminarse en la Fase 3 (Prompt 16). El archivo HTML activo es `front/index.html` y la hoja de estilos activa es `front/src/index.css`.

---

## 2. Reglas Obligatorias del Frontend

1. **Cliente HTTP único (`src/services/api.ts`):**
   - Todas las llamadas al backend deben realizarse a través de la instancia `api` (o mediante los métodos tipados en `ApiService` / `AuthService`), nunca con `fetch` directo ni `axios` crudo, para garantizar la inyección del token JWT y el manejo de expiración (`401`).
2. **Tipado estricto (`src/types/index.ts`):**
   - Toda nueva respuesta o payload del backend debe tener su interfaz en `src/types/index.ts`. Evitar agregar nuevos `: any` o `as any`.
3. **Formato de Moneda y Números:**
   - Usar siempre `formatCurrency(valor)` de `src/utils/formatters.ts` para mostrar valores en Pesos Colombianos (`COP`).
   - Recordar que el medio de pago `"Retiro de ahorros"` tiene un tratamiento contable especial: descuenta del ahorro mensual y no del ingreso disponible del mes.
4. **Modales y Notificaciones:**
   - Renderizar modales dentro de `<ModalPortal>` para evitar problemas de `z-index` o `overflow` con los contenedores glassmorphism.
   - Usar `useToast()` (`showSuccess`, `showError`, etc.) en lugar de `alert()` nativos.

---

## 3. Comandos Útiles

```bash
cd front
npm run dev       # Servidor de desarrollo Vite en http://localhost:4200
npm run build     # Typecheck (tsc -b) + empaquetado de producción en front/dist
npm run preview   # Vista previa local del build de producción
```

# =========================================================
# Etapa 1: Construcción del Frontend (React + Vite)
# =========================================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/front

# Instalar dependencias del frontend
COPY front/package*.json ./
RUN npm ci

# Copiar código fuente del frontend y compilar
COPY front/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# =========================================================
# Etapa 2: Servidor de Producción (Backend Express + Front)
# =========================================================
FROM node:20-alpine

WORKDIR /app/back

# Instalar dependencias de producción del backend
COPY back/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copiar código del backend
COPY back/ ./

# Copiar el build estático del frontend a /app/front/dist
COPY --from=frontend-build /app/front/dist /app/front/dist

# Crear carpetas de ejecución si no existen
RUN mkdir -p uploads logs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/app.js"]


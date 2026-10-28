FROM node:20-alpine

WORKDIR /app

# Copiar manifiesto de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production --legacy-peer-deps

# Copiar código de la aplicación
COPY . .

# Crear carpeta de subidas si no existe
RUN mkdir -p uploads

# Exponer el puerto 3000 por defecto
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/app.js"]

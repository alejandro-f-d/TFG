# Etapa 1: Build
FROM node:18-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Producción
FROM nginx:stable-alpine
# Copia los archivos del build (ajusta 'dist' si tu framework usa 'build' o 'out')
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Exponemos el puerto estándar de Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

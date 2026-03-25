FROM node:22-alpine AS build-stage

WORKDIR /app

COPY frontend-medal/package*.json ./

RUN npm install

COPY frontend-medal/ .

RUN npm run build

CMD ["npm", "run", "start"]

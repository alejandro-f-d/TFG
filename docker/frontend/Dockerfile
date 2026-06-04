FROM node:22-alpine AS build-stage

WORKDIR /app

COPY frontend-medal/package*.json ./

RUN npm install

COPY frontend-medal/ .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

CMD ["npm", "run", "start"]

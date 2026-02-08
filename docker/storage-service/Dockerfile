FROM node:18-alpine

RUN apk add --no-cache ghostscript graphicsmagick

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data/pdfs && chown -R node:node /usr/src/app /app/data/pdfs
USER node

EXPOSE 3001 
CMD ["node", "fichero.js"]

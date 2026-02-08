FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN chown -R node:node /usr/src/app
USER node

CMD ["node", "fichero.js"]

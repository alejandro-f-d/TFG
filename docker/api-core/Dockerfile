FROM node:18-alpine
RUN apk update && apk add --no-cache curl

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN chown -R node:node /usr/src/app
USER node

EXPOSE 8080
CMD ["npm", "start"]

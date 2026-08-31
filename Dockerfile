FROM node:20-alpine

WORKDIR /app

# node-canvas/sharp necesitan estas librerías nativas en Alpine
RUN apk add --no-cache vips-dev

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]

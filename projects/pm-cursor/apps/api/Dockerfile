FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/

RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev", "--workspace=apps/api"]

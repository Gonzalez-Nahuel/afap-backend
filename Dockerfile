FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/afap" npx prisma generate

RUN npm run build


FROM node:22-slim AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node package*.json ./

RUN npm ci --omit=dev

COPY --from=builder --chown=node:node /app/dist ./dist

COPY --from=builder --chown=node:node /app/prisma ./prisma

COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts

USER node

EXPOSE 3000

CMD ["node", "dist/src/server.js"]

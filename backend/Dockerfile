# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# openssl para Prisma en Alpine (sin deps nativas — bcryptjs es JS puro)
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm config set fetch-retries 10 \
 && npm config set fetch-retry-mintimeout 30000 \
 && npm config set fetch-retry-maxtimeout 300000 \
 && npm config set registry https://registry.npmjs.org/ \
 && npm ci --no-audit --fund=false

COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# Production stage — sin npm ci (evita otra descarga en la Pi)
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache wget openssl

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/src/main.js"]

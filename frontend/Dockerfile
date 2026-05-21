# Quasar 2.6 requiere Node >= 22.22
FROM node:22-alpine AS builder

WORKDIR /app

# Build frontend en Pi puede usar bastante RAM
ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package*.json ./

RUN npm config set fetch-retries 10 \
 && npm config set fetch-retry-mintimeout 30000 \
 && npm config set fetch-retry-maxtimeout 300000 \
 && npm config set registry https://registry.npmjs.org/ \
 && npm ci --no-audit --fund=false

COPY . .

ARG VITE_API_URL=
ARG VITE_WS_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

FROM nginx:alpine AS production

COPY --from=builder /app/dist/spa /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

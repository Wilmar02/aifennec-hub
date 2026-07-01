FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./dist/db/migrations
# Los JSON no los emite tsc; se copian explícitos (el wildcard *.json no matchea
# de forma fiable el dotfile .state.json). Ambos son seed; en prod el .state.json
# debe vivir en un volumen persistente (COBRANZA_DRAFTS_STATE_PATH).
COPY --from=builder /app/src/modules/cobranza-drafts/clientes.json ./dist/modules/cobranza-drafts/clientes.json
COPY --from=builder /app/src/modules/cobranza-drafts/.state.json ./dist/modules/cobranza-drafts/.state.json
COPY package.json pnpm-lock.yaml ./

USER node
CMD ["node", "dist/index.js"]

FROM node:20-alpine AS base
RUN npm install -g pnpm@9.4.0

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/telegram/package.json ./packages/telegram/
COPY packages/compliance/package.json ./packages/compliance/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @ivengo/db generate
RUN pnpm --filter @ivengo/worker build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/node_modules/.prisma ./node_modules/.prisma

CMD ["node", "dist/index.js"]

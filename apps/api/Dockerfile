FROM node:20-alpine AS base
RUN npm install -g pnpm@9.4.0

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/telegram/package.json ./packages/telegram/
COPY packages/compliance/package.json ./packages/compliance/
COPY packages/generator/package.json ./packages/generator/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @ivengo/db generate
RUN pnpm --filter @ivengo/api build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@9.4.0
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001
CMD ["node", "dist/index.js"]

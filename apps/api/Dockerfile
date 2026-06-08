FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl
RUN npm install -g pnpm@9.4.0 prisma@5.16.0 ts-node tsconfig-paths

COPY package.json pnpm-workspace.yaml tsconfig.json ./
COPY apps/api/ ./apps/api/
COPY packages/db/ ./packages/db/
COPY packages/telegram/ ./packages/telegram/
COPY packages/compliance/ ./packages/compliance/
COPY packages/generator/ ./packages/generator/
RUN pnpm install --no-frozen-lockfile
RUN prisma generate --schema=packages/db/prisma/schema.prisma

ENV NODE_ENV=production
ENV NODE_PATH=/usr/local/lib/node_modules
ENV TS_NODE_TRANSPILE_ONLY=true
ENV TS_NODE_PROJECT=apps/api/tsconfig.json
EXPOSE 3001
CMD ["ts-node", "-r", "tsconfig-paths/register", "apps/api/src/index.ts"]

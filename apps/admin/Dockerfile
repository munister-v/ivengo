FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm@9.4.0

COPY package.json pnpm-workspace.yaml ./
COPY apps/admin/ ./apps/admin/
RUN pnpm install --no-frozen-lockfile

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_BASE_PATH=/ivengo
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_BASE_PATH=$NEXT_BASE_PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @ivengo/admin build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@ivengo/admin", "start"]

# syntax=docker/dockerfile:1.7
# Общий образ для семи сервисов (FR-123): ARG SERVICE выбирает сервис, например `identity-service`.
# Одноразовые задачи переопределяют command: node dist/migrate.js | dist/seed.js | dist/bootstrap.js.
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
ARG SERVICE
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages ./packages
COPY services/${SERVICE} ./services/${SERVICE}
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "${SERVICE}..."
RUN pnpm --filter "${SERVICE}" build
# Код @blog/* вшит в бандл сервиса, поэтому его зависимости должны находиться из dist/main.js:
# плоский (hoisted) node_modules в образе, а не изолированная раскладка pnpm.
RUN npm_config_node_linker=hoisted pnpm --filter "${SERVICE}" deploy --prod /out

FROM node:${NODE_VERSION}-slim AS runtime
ARG SERVICE
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /repo/services/${SERVICE}/dist ./dist
USER node
CMD ["node", "dist/main.js"]

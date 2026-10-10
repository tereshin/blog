# syntax=docker/dockerfile:1.7
# Только local: один образ для семи сервисов и клиента, запуск из исходников с перезапуском при изменениях.
# Исходники (`src`) монтируются томами из docker-compose.local.yml; в образе — зависимости всего workspace.
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# Слой установки зависит только от манифестов: правка исходников не запускает pnpm install заново.
FROM base AS manifests
WORKDIR /repo
COPY . .
RUN find . -type f ! -name package.json ! -name pnpm-lock.yaml ! -name pnpm-workspace.yaml ! -name .npmrc -delete \
 && find . -type d -empty -delete

FROM base AS dev
RUN mkdir /repo && chown node:node /repo
USER node
WORKDIR /repo
COPY --from=manifests --chown=node:node /repo ./
RUN --mount=type=cache,id=pnpm-dev,target=/pnpm/store,uid=1000,gid=1000 \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY --chown=node:node . .
ENV PATH=/repo/node_modules/.bin:$PATH

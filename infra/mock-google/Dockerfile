# syntax=docker/dockerfile:1.7
# Тестовый OIDC-провайдер (FR-132). Собирается и запускается только в local и dev; в prod его нет.
# Контекст сборки — корень репозитория.
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages ./packages
COPY infra/mock-google ./infra/mock-google
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "mock-google..."
RUN pnpm --filter mock-google build
RUN npm_config_node_linker=hoisted pnpm --filter mock-google deploy --prod /out

FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /repo/infra/mock-google/dist ./dist
USER node
EXPOSE 8081
CMD ["node", "dist/main.js"]

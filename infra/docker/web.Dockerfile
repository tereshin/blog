# syntax=docker/dockerfile:1.7
# Статика клиента: сборка Vite -> nginx-unprivileged (FR-126: gateway статику не раздаёт).
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Не секрет: адрес gateway. В prod пустой — клиент и gateway на одном origin.
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter web...
RUN pnpm --filter web build

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
# Git checkouts made by the production updater can have a restrictive umask.
# The unprivileged nginx process must own both the template and copied public files.
COPY --chown=nginx:nginx infra/docker/web.nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build --chown=nginx:nginx /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080

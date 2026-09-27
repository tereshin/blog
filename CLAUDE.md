# blog

Conventions for this repository. The foundation is recorded in `docs/architecture-map.md` and the ADRs under `docs/adr/`. Follow those decisions. Do not pick a second stack.

## Stack

- Node.js 24, TypeScript, pnpm workspaces, Turborepo.
- `apps/api-gateway`: NestJS on the Fastify adapter. It is the only public HTTP entry. `GET /health/live` is the liveness check.
- `apps/web`: Next.js App Router shell for the public site. Feature-Sliced folders (`entities`, `features`, `widgets`, `shared`) arrive with the first screen.
- PostgreSQL 18 via Drizzle and `drizzle-kit` in `packages/database`.
- Vitest runs unit tests and the gateway boot smoke test.
- Later apps and packages (admin, domain services, `packages/ui`, `packages/i18n`, Redis, RabbitMQ, MinIO, Firebase) are added by features. Do not stub them as empty apps.

## Commands

- `pnpm turbo build`
- `pnpm turbo test`
- `pnpm turbo lint`
- `pnpm turbo typecheck`
- `pnpm --filter @blog/database db:migrate` applies SQL with `drizzle-kit migrate`.
- `pnpm --filter @blog/database db:rollback` reverts the latest migration. `drizzle-kit` has no down command. Each forward file `migrations/<tag>.sql` has a sibling `migrations/<tag>.down.sql`. Rollback runs that SQL and deletes the matching row in `drizzle.__drizzle_migrations`.

Local Postgres is `docker compose up -d`. Copy `.env.example` to `.env` when you need `DATABASE_URL`. The host port defaults to `5432`.

## Schema per service

One PostgreSQL cluster. Each NestJS service owns one schema and is the only writer of that schema. No SQL join across schemas. Synchronous reads and commands go through the gateway over HTTP. Domain events go through RabbitMQ, at least once, from a transactional outbox, and consumers are idempotent.

Schema names follow the brief: `users`, `content`, `comments`, `engagement`, `social`, `messages`, `notifications`, plus category, media, and feed schemas when those services exist.

Inside a service, a controller accepts HTTP and a service holds the business rules. Drizzle is the only database access.

## Drizzle and UUIDv7

Migrations are SQL in `packages/database/migrations`, one history per schema, and every migration is reversible. Primary keys are app-generated UUIDv7. A Firebase UID is a lookup key on the user, never the primary key.

## Errors

API errors are a JSON envelope and nothing else. No user-facing sentence in the body. The client translates `code`.

```json
{
  "error": {
    "code": "ARTICLE_VERSION_CONFLICT",
    "params": { "serverVersion": 12 }
  }
}
```

## UI

HeroUI v3 and Tailwind CSS v4, shared through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.

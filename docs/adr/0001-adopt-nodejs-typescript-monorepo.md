---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: ""
ticket: ""
---

# 0001 — Adopt the Node.js 24 TypeScript monorepo from the product brief

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (survey confirmation)

## Context

The repository has no application source. `docs/TASK.md` already fixes the product as a publishing platform with a public site, an admin panel on `admin.<domain>`, and several backend services. The foundation has to be recorded before `scaffold` creates folders, or the first feature will invent a stack.

## Decision drivers

- Public article pages must return HTML for search engines (`docs/TASK.md` §4, §39).
- The admin panel does not need server rendering (`docs/TASK.md` §4).
- Live counters and messages update the UI without a reload (`docs/TASK.md` §1, §21).
- One repository must share API and event contracts between apps (`docs/TASK.md` §47).

## Considered options

1. **The brief's stack** — Node.js 24, TypeScript, NestJS on Fastify, Next.js, a Vite admin SPA, PostgreSQL 18, Redis 8, RabbitMQ, Socket.IO, Firebase Authentication, MinIO, pnpm workspaces, and Turborepo.
2. **The same languages as one deployable process** — one NestJS app and one Next.js app, with modules inside the process instead of separate services.
3. **Prisma as the only persistence tool inside that stack** — rejected in [0003](0003-use-drizzle-and-uuidv7.md); listed here only because the brief left the ORM open.

## Decision outcome

**Chosen:** Option 1. The repository owner confirmed the brief's stack as the foundation. Option 2 would throw away the service list in `docs/TASK.md` §65. The admin app stays a Vite SPA because it has no SEO requirement.

## Consequences

**Positive**

- Next.js can server-render public articles. The admin app stays a static SPA.
- Shared packages (`contracts`, `ui`, `i18n`) have one version across web, admin, and services.
- Node.js 24 is the LTS line named in the brief. Node.js 26 was still Current when the brief was written.

**Negative**

- Several processes, a queue, Redis, and Postgres must be running before a full local stack is useful. The scaffold skeleton only boots the workspace, one gateway, and the web shell.
- Firebase is an external identity provider. Business users still live in Postgres.

**Neutral**

- HeroUI v3 and Tailwind CSS v4 are the only UI kit. A second component library would split the design system.

## Links

- Product brief: [TASK.md](../TASK.md) §4, §47
- Related ADR: [0002](0002-own-data-per-nestjs-service.md), [0003](0003-use-drizzle-and-uuidv7.md)

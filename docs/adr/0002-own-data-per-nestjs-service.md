---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: ""
ticket: ""
---

# 0002 — Give each NestJS service its own PostgreSQL schema

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (survey confirmation)

## Context

The brief splits the platform into services (users, content, categories, media, comments, engagement, social, feed, messaging, notifications, realtime) behind an API gateway. Each service needs a place to store rows without reading another service's tables. That rule has to be true on day one, while there is still a single Postgres cluster.

## Decision drivers

- A service must not query another service's tables (`docs/TASK.md` §42, §64 rule 10).
- Writes that emit a domain event must be durable together with the row (`docs/TASK.md` §23, §64 rule 13).
- The cluster may later be split into physical databases without rewriting call sites (`docs/TASK.md` §42).
- Likes, views, and bookmarks stay one service. Follows of authors and of categories stay one service (`docs/TASK.md` §65).

## Considered options

1. **One PostgreSQL 18 cluster, one schema per service.** Services talk over HTTP and RabbitMQ. Each write that emits an event uses a transactional outbox.
2. **A separate database server per service now.** Stronger isolation, and more local infrastructure before the first feature.
3. **Shared tables in one schema, with SQL joins across services.** Simpler queries, and it blocks a later split.

## Decision outcome

**Chosen:** Option 1. It matches §42 of the brief and still lets a later move to a database per service. Inside a service, a controller accepts the request and a service holds the business rules. Persistence goes through that service's Drizzle client (see [0003](0003-use-drizzle-and-uuidv7.md)).

## Consequences

**Positive**

- Cross-service joins are a review defect, not a style preference.
- Feed, counters, and notifications can lag the write by a short time. The row in the owning schema is the source of truth (`docs/TASK.md` §51).
- Engagement stays one deployable. Social subscriptions stay one deployable.

**Negative**

- A screen that needs an author and an article must call two services (or the gateway must aggregate). There is no join to lean on.
- The outbox and idempotent consumers are mandatory for every event-producing write, including the first feature that publishes one.

**Neutral**

- Schema names follow the brief: `users`, `content`, `comments`, `engagement`, `social`, `messages`, `notifications`, plus schemas for categories, media, and feed when those services are built.

## Links

- Product brief: [TASK.md](../TASK.md) §6, §42, §64, §65
- Related ADR: [0001](0001-adopt-nodejs-typescript-monorepo.md), [0003](0003-use-drizzle-and-uuidv7.md)

---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0004 — Cache feed pages in Redis

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

Fresh, Popular, and My feed are read far more often than they change. The cached-read target is tighter than the uncached one. Redis is already the ephemeral store in the foundation. It must not be the only copy of an Article.

## Decision drivers

- Cached feed or Article read p95 ≤ 100 ms, measured as server timing of cached reads (spec §6).
- Uncached read p95 ≤ 300 ms when the cache misses (spec §6).
- A page is 20 Articles (spec §6).

## Considered options

1. **Redis page cache in the feed service.** A publish, hide, or soft-remove event drops the affected pages. Postgres remains the source of the rows.
2. **HTML cache only on the public site.** The feed service always reads Postgres. The site caches the rendered page.

## Decision outcome

**Chosen:** Option 1. The 100 ms figure is server timing of the feed read, so the cache has to sit on that read. The public site may also cache rendered Article HTML. That HTML cache does not replace the feed page cache.

## Consequences

**Positive**

- A cache hit avoids reassembling My feed.
- Invalidation follows the same events the realtime path already consumes.

**Negative**

- A missed invalidation serves a stale page until the TTL. Event-driven drops are required, not optional.

**Neutral**

- Article bodies stay in Postgres. Redis holds pages and counters only.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0001-assemble-my-feed-on-read.md]]

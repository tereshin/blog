---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0001 — Assemble My feed on read

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

A signed-in User opens My feed and must see every currently published Article from the Users and Categories they follow, newest first, each Article once. Follows live in the social schema. Articles live in the content schema. Cross-schema SQL is forbidden.

## Decision drivers

- Cached feed read p95 ≤ 100 ms (spec §6).
- My feed shows each Article once, newest first (spec AC-14).
- A Follow that starts or stops must change the next page without a backfill of inboxes.
- One schema per service (`docs/adr/0002-own-data-per-nestjs-service.md`).

## Considered options

1. **Assemble on read.** The feed service loads the User's Follows and the published Articles of those sources, dedupes, orders newest first, and caches the page in Redis.
2. **Fan out on write.** Publishing an Article copies a reference into an inbox row for every current follower. The read is a lookup of that inbox.

## Decision outcome

**Chosen:** Option 1. The brief recommends it for this release, and a new Follow or an unfollow is correct on the next read. Option 2 duplicates an Article into many inboxes and must be rebuilt when someone follows later.

## Consequences

**Positive**

- Unfollow and a new Follow need no inbox repair.
- Deduping one Article that matches both a followed User and a followed Category happens at read time.

**Negative**

- A cache miss does more work than an inbox lookup. The Redis page cache in ADR 0004 is what keeps the cached-read target.

**Neutral**

- Moving to write fan-out later means a new inbox table and a backfill. The read API can stay a page of Articles.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0004-cache-feed-pages-in-redis.md]]

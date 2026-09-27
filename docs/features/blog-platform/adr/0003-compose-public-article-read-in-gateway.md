---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0003 — Compose the public Article read in the gateway

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

A published Article page shows the text, images, Comments, and counts. Those rows sit in content, users, comments, and engagement. The public site must render HTML without a cross-schema join, and services are not on the public network.

## Decision drivers

- Uncached feed or Article read p95 ≤ 300 ms (spec §6).
- Published Article page largest content paint ≤ 2.5 s (spec §6).
- The gateway is the only public HTTP entry (`CLAUDE.md`).

## Considered options

1. **The gateway composes one payload.** It calls the owning services and returns one Article read. The public site renders that payload to HTML.
2. **The Next.js server composes the page.** It calls several gateway routes and assembles the HTML itself.

## Decision outcome

**Chosen:** Option 1. One composition keeps the uncached clock on the gateway, which is where server timing is measured. The public site stays a renderer of one read.

## Consequences

**Positive**

- The site does not learn every service's route.
- A cache of the composed read can sit in front of one gateway response.

**Negative**

- The gateway becomes a fan-out point. A slow comments call holds the whole Article read.

**Neutral**

- Admin screens keep calling the admin routes for one resource at a time. This decision is the public Article read.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0004-cache-feed-pages-in-redis.md]]

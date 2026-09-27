---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0008 — Upload article images with presigned URLs

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

An Article may carry an image. The bytes do not belong in Postgres. The publish write has a tight latency budget, and the gateway is the only public HTTP entry for JSON, not for file bodies.

## Decision drivers

- Write p95 ≤ 300 ms for publish (spec §6).
- An Article with no image still publishes (spec AC-43).
- Image attachments are limited to 20 per hour (spec §6.1).
- Redis and Postgres must not be the only copy of the file. Object storage holds the bytes (architecture map).

## Considered options

1. **Presigned upload.** The media service returns a time-limited URL. The browser sends the bytes to object storage. The Article stores the object reference.
2. **Proxy the bytes.** The browser posts the file to the media service, and that service writes object storage.

## Decision outcome

**Chosen:** Option 1. Publish stays a JSON write. The byte transfer does not sit inside the 300 ms publish budget. Option 2 pulls every image through an application process.

## Consequences

**Positive**

- The gateway never buffers image bodies.
- A missing image is just a publish with no object reference.

**Negative**

- The client makes two calls, URL then bytes, and the second can fail after the URL was issued. Orphan objects need a later sweep. That sweep is accepted debt only if it shows up. For now the media service can expire unused URLs.

**Neutral**

- Avatars can use the same media path later. This decision is the Article image.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §5
- Related ADR: [[0007-reject-embed-and-raw-html-blocks.md]]

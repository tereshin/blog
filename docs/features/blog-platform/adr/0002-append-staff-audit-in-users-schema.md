---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0002 — Append the staff audit log in the users schema

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

Every hide, Block, role change, staff soft-remove, Complaint dismissal, and Category change must be readable later. The trail cannot be rewritten. Hide lives in content, Block and roles live in users, and a Complaint lives with the piece it reports. One service cannot write another service's schema.

## Decision drivers

- The audit trail is internal and must record a reason on hide, Block, role change, and dismissal (spec §6.1, AC-36).
- An Administrator reads the whole trail. A Moderator reads only their own actions (spec AC-37).
- The service list stays the one in the architecture map. No extra moderation service.

## Considered options

1. **One append-only table in schema `users`.** The users service is the only writer. After a staff command succeeds, the gateway asks the users service to append the row. Database grants reject UPDATE and DELETE.
2. **An append-only table in each owning schema.** The gateway merges those tables when someone opens the trail.

## Decision outcome

**Chosen:** Option 1. One table matches the single audit screen and the brief's `admin_audit_log`. Option 2 spreads one trail across schemas and makes "Moderator sees only their own rows" a merge of several lists.

## Consequences

**Positive**

- The Administrator's read is one query in the users service.
- Append-only grants sit on one table.

**Negative**

- The audit row is not in the same database transaction as the hide or the Block. A failed append is the risk in SAD §11.

**Neutral**

- A later physical split of the users database takes the trail with that service.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0011-relay-outbox-from-worker-process.md]]

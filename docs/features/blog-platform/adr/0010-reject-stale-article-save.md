---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0010 — Reject a stale Article save

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

The editor autosaves while the author types, and a published Article can be revised. Two overlapping saves must not drop a paragraph. Readers see the latest text. The previous version stays recorded and is not browsable in this release.

## Decision drivers

- Revising a published Article keeps the previous version, and readers see the new text (spec AC-11).
- Article edits are limited to 60 per minute (spec §6.1), so retries are normal.
- The error envelope carries a code, not a sentence. The repo's example code for this case is `ARTICLE_VERSION_CONFLICT`.

## Considered options

1. **Optimistic version check.** The client sends the version it last saw. The content service rejects a mismatch with `ARTICLE_VERSION_CONFLICT` and leaves the stored version in place.
2. **Last write wins.** The later save overwrites. The client is not told the copy was stale.

## Decision outcome

**Chosen:** Option 1. An autosave retry and a second tab are both normal. Option 2 silently drops whichever save arrives second.

## Consequences

**Positive**

- The recorded previous version is the one the author saved, not a torn mix of two tabs.

**Negative**

- The client must refresh its version and send the edit again after a conflict. The preview on the screen can be ahead of the server until that retry (ADR 0005).

**Neutral**

- Readers still have no version browser. Storage of the previous version is a content-schema concern for the data-model stage.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §8
- Related ADR: [[0005-render-draft-preview-on-editor-screen.md]]

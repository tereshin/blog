---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0005 — Render the draft preview on the editor screen

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

The author edits one draft and watches a second preview of the same edits. The preview has to follow a keystroke that the editor has kept. The brief also describes a separate preview URL fed by a Socket.IO room.

## Decision drivers

- Draft preview p95 ≤ 300 ms, from a keystroke being kept to the second preview showing it (spec §6).
- The draft is kept while the author types, and the second preview shows the same edits (spec AC-07).
- ux-flows SCR-08 is one editor screen, not a second destination.

## Considered options

1. **Same-screen preview.** The editor screen renders the second preview from the Editor.js JSON it just kept. Server autosave is a separate write and does not gate the preview.
2. **A second preview URL.** Another client joins a draft socket room and renders the blocks the realtime gateway pushes.

## Decision outcome

**Chosen:** Option 1. The 300 ms clock starts when the keystroke is kept in the draft the preview already shares. Option 2 adds a socket hop and a second route the screen inventory does not have.

## Consequences

**Positive**

- The preview stays inside 300 ms without waiting for the server debounce.
- One screen matches SCR-08.

**Negative**

- A second browser on another machine does not see the draft live. This release does not promise that.

**Neutral**

- Autosave still uses optimistic locking (ADR 0010). The preview can be ahead of the last saved version by the debounce interval.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0010-reject-stale-article-save.md]]

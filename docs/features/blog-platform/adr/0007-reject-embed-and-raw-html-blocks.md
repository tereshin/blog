---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0007 — Reject embed and raw HTML blocks

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

Article text is stored as Editor.js JSON and rendered to HTML for the public page. The brief's editor tool list includes an embed block and raw HTML for trusted authors. This release's spec leaves an embed allowlist out and says a reader sees text, not a running instruction.

## Decision drivers

- Abuse case: Article text or a Comment must not carry an instruction that runs for a reader (spec §6.1).
- An allowlist of embedded content is out of this release (spec §3).
- Security review is required (spec §6.1).

## Considered options

1. **Reject embed and raw HTML on write.** The content service validates each block, drops those two types, sanitizes the rest, and stores the rendered HTML of the allowed blocks.
2. **Allow an embed allowlist and raw HTML for trusted authors,** as the brief's tool list describes.

## Decision outcome

**Chosen:** Option 1. The spec closes embeds for this release, and raw HTML is the same class of risk as an instruction that runs for a reader. Option 2 waits for a later release that names an allowlist.

## Consequences

**Positive**

- The public HTML renderer has a fixed set of blocks.
- A stored body cannot introduce an iframe or a script through those two types.

**Negative**

- Authors cannot embed a third-party player in this release.

**Neutral**

- Image blocks stay, through the media upload in ADR 0008. Sanitization of the remaining block types still runs on write.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0008-upload-article-images-with-presigned-urls.md]]

---
id: T21
title: "Issue presigned image uploads"
layer: "app"
deps: ["T4", "T13", "T18"]
blocks: ["T44"]
acs: ["AC-07"]
files_hint: ["apps/media", "apps/content/src/images"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T21 — Issue presigned image uploads

## Place in the sequence

- **Blocked by:** T4 — Promote the media schema migration, T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope, T18 — Save Article drafts with a version check and sanitized HTML · **Blocks:** T44 — Edit and publish a draft on one screen · **Wave:** after media tables and a draft exist.
- **Lane:** `apps/content/src/images` overlaps the content lane — serialized with T18.

## Why (user story)

> **As a** User
> **I want** to draft an Article, keep the draft as I type, see those edits in a second preview, attach an image, and publish it into one Category
> **So that** readers and followers can see the finished piece
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task lets the author attach an image without sending the bytes through the gateway.

## Inlined context

> Chosen: Option 1. The browser asks the gateway for the URL, the media service issues it, and the browser sends the bytes to object storage. Publish stays a JSON write. The gateway never buffers image bodies.
>
> — `0008-upload-article-images-with-presigned-urls.md §Decision outcome, presigned URL, abridged` · full text: [0008-upload-article-images-with-presigned-urls.md](../adr/0008-upload-article-images-with-presigned-urls.md)

> Inside each NestJS app the layers are a controller, a service, and a Drizzle module for that app's schema. Business rules do not live in React components. Empty apps are not stubbed ahead of the task that needs them.
>
> — `sad.md §5, Internal decomposition, abridged` · full text: [sad.md](../sad.md)

> `status` is `pending` when the URL is issued and `ready` when the upload finishes. Bytes are not in this table.
>
> — `data-model.md §Entities, media.media_objects, abridged` · full text: [data-model.md](../data-model.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `media_objects.status` | text | `pending` then `ready` | insert and update |
| `content.article_images` | link | article id and media id, no cross-schema FK | insert from the content app |

— `data-model.md §Entities, media.media_objects, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/media/uploads` → `201` with the presigned URL and the media id.
- `POST /api/v1/me/articles/{article_id}/images` → `201` · error `404 MEDIA_NOT_FOUND`.

— `openapi.yaml §paths, createMediaUpload, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-07 — happy path

> **Given** a User who already has a Username, an open draft, a second preview of that draft, and one Category
> **When** the User types, attaches an image, sets the Content language, and publishes
> **Then** the draft is kept while they type, the second preview shows the same edits, and the published Article shows that text, that image, that Category, and that Content language to a Guest
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Add `apps/media` to issue a presigned PUT and insert `media.media_objects`
- [ ] Mark the object ready when storage confirms the upload
- [ ] In the content app, link a ready image to the author's Article. Do not accept the image bytes on the gateway

## Edge cases

| Case | Behaviour |
|---|---|
| Unknown media id | Return `MEDIA_NOT_FOUND` and do not link |
| Publish with no image | Leave that path to T19. This task does not require an image |

## Definition of Done

- [ ] Vitest covers a presigned URL that does not include image bytes, and an attach that links a ready object for AC-07
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package

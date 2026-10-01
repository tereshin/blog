---
id: T46
title: "Show conversations and a live thread"
layer: "ui"
deps: ["T40", "T28", "T39"]
blocks: []
acs: ["AC-21", "AC-22", "AC-25"]
files_hint: ["apps/web/src/features/messages", "packages/i18n/messages/messages"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T46 — Show conversations and a live thread

## Place in the sequence

- **Blocked by:** T40 — Share HeroUI tokens, Theme, and Interface language, T28 — Exchange Direct messages between two Users, T39 — Push live Article and Direct message updates · **Blocks:** none · **Wave:** after messaging and the conversation socket exist.
- **Lane:** own feature folder.

## Why (user story)

> **As a** User
> **I want** to send a Direct message to one other User
> **So that** we can talk even if they are away, and I can see when they have read it
>
> — `spec.md §4, US-12, verbatim` · full text: [spec.md](../spec.md)

This task lists conversations, sends a message, and shows a new message without reload.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> SCR-11 states: `default`, `loading`, `empty`, `theme-applied`, `locale-fallback`. SCR-12 states: `default`, `loading`, `empty-thread`, `message-invalid`, `live`, `account-blocked`, `not-found`, `recipient-missing`, `error`, `theme-applied`, `locale-fallback`. Components: PublicShell, Card, Textarea, Button, Skeleton, EmptyState, Toast.
>
> — `screens.md §Screens, SCR-11 SCR-12, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- `listConversations`, `listConversationMessages`, `createDirectMessage`, `markConversationRead`.
- `MESSAGE_BODY_REQUIRED` is `message-invalid`. The socket from T39 is `live`.

— `openapi.yaml §paths, createDirectMessage, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-21 — happy path

> **Given** two Users, and the recipient is not currently present
> **When** the sender sends a Direct message
> **Then** the message is kept, the recipient later sees it with an unread count, and after the recipient reads it the sender sees that it was read
>
> — `spec.md §5, AC-21, verbatim` · full text: [spec.md](../spec.md)

### AC-22 — error

> **Given** a User in a conversation with one other User
> **When** the User tries to send a message with no text
> **Then** the system blocks the send and tells the User that the message must contain text
>
> — `spec.md §5, AC-22, verbatim` · full text: [spec.md](../spec.md)

### AC-25 — happy path

> **Given** a Guest or a User is looking at a published Article, and a User is in a Direct message conversation
> **When** someone Likes the Article, Comments on it, a Moderator or an Administrator hides that Article or that Comment, or a Direct message arrives
> **Then** the Like count, the Comment count, and the new, hidden, or unavailable Article or Comment change on the open view without a reload for that Guest and that User, the Direct message changes without a reload only for the Users in that conversation, and the View count does not have to change on that open view
>
> — `spec.md §5, AC-25, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Build SCR-11 and SCR-12. Show the unread count and, after read, the sender's read mark
- [x] Block an empty send in the UI from `MESSAGE_BODY_REQUIRED`
- [x] Append a socket message for this conversation only

## Edge cases

| Case | Behaviour |
|---|---|
| No text | `message-invalid` |
| No conversations | SCR-11 `empty` |
| Outsider | SCR-12 `not-found` |

## Definition of Done

- [x] Component tests cover SCR-11 `empty`, SCR-12 `default`, `message-invalid`, and `live`
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package

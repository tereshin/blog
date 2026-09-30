---
id: T14
title: "Record a User profile and a unique Username"
layer: "app"
deps: ["T1", "T13"]
blocks: ["T15", "T18", "T26", "T27", "T28", "T33", "T35", "T43"]
acs: ["AC-05", "AC-06", "AC-42", "AC-46"]
files_hint: ["apps/users"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T14 — Record a User profile and a unique Username

## Place in the sequence

- **Blocked by:** T1 — Promote the users schema migration, T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope · **Blocks:** T15 — Assign one role and keep the last Administrator, T18 — Save Article drafts with a version check and sanitized HTML, T26 — Follow and unfollow Users and Categories, T27 — Serve Fresh, Popular, and My feed, T28 — Exchange Direct messages between two Users, T33 — Compose the public Article read and refuse a Guest write, T35 — Report platform statistics to an Administrator, T43 — Sign in and edit a public profile · **Wave:** after the users migration and the shared packages.
- **Lane:** shares `apps/users` with T15, T16, and T36 — serialized.

## Why (user story)

> **As a** User
> **I want** a unique Username and a public profile
> **So that** other people can find me and follow me
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task stores the Username, the public profile fields, and the Content-language limit.

## Inlined context

> Inside each NestJS app the layers are a controller, a service, and a Drizzle module for that app's schema. Business rules do not live in React components. Empty apps are not stubbed ahead of the task that needs them.
>
> — `sad.md §5, Internal decomposition, abridged` · full text: [sad.md](../sad.md)

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> Primary keys are app-generated UUIDv7. A Firebase UID is a lookup key on the user, never the primary key.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> Chosen: Option 1. Inside a service, a controller accepts the request and a service holds the business rules. Persistence goes through that service's Drizzle client.
>
> — `0002-own-data-per-nestjs-service.md §Decision outcome, schema per service, abridged` · full text: [0002-own-data-per-nestjs-service.md](../../../adr/0002-own-data-per-nestjs-service.md)

> `username` is UNIQUE and nullable. Uniqueness is exact, including case. `content_languages` NULL means every Content language. A cleared limit writes NULL. No theme column and no Interface-language column.
>
> — `data-model.md §Entities, users.users, abridged` · full text: [data-model.md](../data-model.md)

> Interface languages `en`, `sr-Latn`, `ru`, English fallback. Content language is a separate field. A User may limit feed Content languages. A Guest has no such limit.
>
> — `sad.md §8, Internationalisation, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `username` | text | UNIQUE, nullable | read-write |
| `display_name` | text | nullable | read-write |
| `biography` | text | nullable | read-write |
| `avatar_url` | text | nullable | read-write |
| `content_languages` | text[] | nullable | read-write |
| `firebase_uid` | text | NOT NULL UNIQUE | lookup only |

— `data-model.md §Entities, users.users, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `GET /api/v1/me` → `200` · `PUT /api/v1/me` → `200` · errors `409 USERNAME_TAKEN`, `422 USERNAME_REQUIRED` on a blank Username when one is required to save.
- `PUT /api/v1/me/content-languages` → `200` · error `422 CONTENT_LANGUAGE_INVALID`.
- `GET /api/v1/users/{username}` → `200` · error `404 USER_NOT_FOUND`.
- A field that was not saved is omitted. Avatar on this route is a URL, not the Article upload.

— `openapi.yaml §paths, updateMe, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-05 — happy path

> **Given** a person who has just signed in and has no Username yet
> **When** they choose a Username that nobody else has and save a public profile
> **Then** the system records that User, and a Guest can open the profile and see the Username
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — error

> **Given** a User is choosing a Username that another User already has
> **When** they try to save it
> **Then** the system blocks the save and tells them that the Username is already taken
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-42 — happy path

> **Given** a User who already has a Username
> **When** they save a Display name, a Biography, or an Avatar
> **Then** a Guest who opens the profile sees each field that was saved, and a field that was not saved is absent
>
> — `spec.md §5, AC-42, verbatim` · full text: [spec.md](../spec.md)

### AC-46 — cross-context

> **Given** a User
> **When** they set a Content language limit to one or more of English, Serbian Latin, and Russian, or they clear that limit
> **Then** the Fresh feed, the Popular feed, and My feed show only the chosen Content languages, and a cleared limit shows every Content language
>
> — `spec.md §5, AC-46, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Add `apps/users` with a controller, a profile service, and a Drizzle module for schema `users`
- [ ] Upsert the User from the Firebase UID. Generate `id` as UUIDv7. Never use the Firebase UID as the primary key
- [ ] Reject a taken Username with `USERNAME_TAKEN`. Leave an unsaved Display name, Biography, or Avatar absent
- [ ] Store a Content-language limit, and write NULL when the limit is cleared
- [ ] Record `users.user_sign_ins` with `ON CONFLICT DO NOTHING` for the UTC day

## Edge cases

| Case | Behaviour |
|---|---|
| Username differs only by case | Treat it as taken. Uniqueness is exact, including case |
| Cleared Content-language limit | Persist NULL, which means every Content language |
| Guest profile read | Return only saved public fields |

## Definition of Done

- [ ] Vitest covers AC-05, AC-06, AC-42, and AC-46: a unique Username is stored, a duplicate returns `USERNAME_TAKEN`, an unsaved field is omitted, and a cleared limit is NULL
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package

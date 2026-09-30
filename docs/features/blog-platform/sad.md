---
status: Draft
owner: Architect
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-09-30"
feature_size: XL
target_surfaces: [backend-service, web-frontend, worker]
---

# Software Architecture Document — blog-platform

## 1. Introduction and goals

**Intent.** Readers and writers get one public place to publish topical writing, follow authors and topics, and respond. Staff get a separate admin panel to hide abuse. A Guest reads. A User writes and participates. A Moderator and an Administrator act only from the admin panel, after a second factor. Signing in on the public site does not open that panel.

**Top-3 quality goals (1-liners; full scenarios in §10):**

1. A cached feed or Article read stays at p95 ≤ 100 ms.
2. An open Article shows a new Like count, a Comment count change, a new or hidden Comment, or a hide at p95 ≤ 500 ms.
3. Published-Article reads succeed for 99.9% of attempts in a month.

**Stakeholders.**

| Role | Interest | Sign-off owner? |
|---|---|---|
| Guest | Read published Articles, feeds, Comments, and public profiles | No |
| User | Publish, follow, Like, Comment, Bookmark, message, and file a Complaint | No |
| Moderator | Hide, Block, handle a Complaint, and move an Article's Category, only from the admin panel | No |
| Administrator | Catalog, roles, weights, statistics, the audit trail, and the same staff actions as a Moderator | No |
| Tech Lead | SAD approval | Yes |
| Security Lead | Security review required by spec §6.1 | Yes |
| PM | Scope lock and the remaining Popular-weight question | No |

**Decision overrides:**

- Decision override: the second preview stays on the editor screen — rationale: spec AC-07 and ux-flows SCR-08. The brief's separate preview URL is outside this release.
- Decision override: the View count is outside the live Article channel — rationale: spec AC-25. The brief's socket aggregation of Views is outside this release.
- Decision override: embed blocks and raw HTML blocks are rejected on write — rationale: spec §3 and the abuse case that a reader sees text, not a running instruction.

## 2. Constraints

**Technical.**

- Node.js 24, TypeScript. The skeleton gateway is NestJS 12 on the Fastify adapter (`apps/api-gateway`). The skeleton public site is Next.js 16 and React 19 (`apps/web`).
- The admin panel is a Vite and React SPA, decided in `docs/adr/0001-adopt-nodejs-typescript-monorepo.md`. That app is not in the workspace yet.
- PostgreSQL 18 is the only datastore in `docker-compose.yml` today. Redis 8, RabbitMQ (brief target 4.3), and MinIO are part of the target foundation and are not in compose yet.
- Firebase Authentication is the identity provider. The Firebase UID is a lookup key, never the primary key (`docs/adr/0003-use-drizzle-and-uuidv7.md`).
- Drizzle and app-generated UUIDv7. One PostgreSQL cluster, one schema per NestJS service, no SQL across schemas (`docs/adr/0002-own-data-per-nestjs-service.md`).
- HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. The web package does not depend on them yet.
- Vitest is the unit-test runner. The gateway liveness check is `GET /health/live`.

**Organisational.**

- Feature size XL, route full.
- No release date is stated in the spec. Deadline is TBD by PM (see §11).
- Team shape is not stated in the spec.

**Conventions.**

- `CLAUDE.md` and `docs/architecture-map.md`. The map's `reflects_commit` is stale against the scaffold; the target containers in that map still bind this feature. The spec does not reopen those service boundaries.
- API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
- The gateway is the only public HTTP entry. Domain events go through RabbitMQ at least once, from a transactional outbox, and consumers are idempotent.
- Inside a service, a controller accepts HTTP and a service holds the business rules. Drizzle is the only database access.
- Primary keys are app-generated UUIDv7. Cursor pagination is the list shape. Offset pagination is not used for feeds.

**Regulatory / external.**

- Spec §6.1 classes: public for published Articles, Comments, and public profiles; confidential for Direct messages, Bookmark lists, and account secrets; internal for the audit trail.
- Personal data in this release: Username, Display name, Biography, Avatar, Direct message text, Bookmark list, Complaint text, and the staff actor on each audit entry.
- Security review is required. This release adds staff powers, a second factor, confidential messages, and new personal data.
- Text contrast meets WCAG 2.2 AA: ≥ 4.5:1 for body text and ≥ 3:1 for large text and controls, in light and dark.
- No sector statute is named in the spec.

## 3. Context and scope

A Guest finds published writing in the Fresh feed and the Popular feed. A User publishes into one Category, follows Users and Categories, and takes part in Likes, Comments, Bookmarks, Direct messages, and in-product Notifications. A Moderator and an Administrator work only on the admin origin, after Firebase multi-factor authentication. The platform does not translate Articles. Interface language and Content language stay separate.

<!-- brownfield: scaffold is apps/api-gateway, apps/web, packages/database, packages/tsconfig, packages/eslint-config. Compose runs PostgreSQL 18 only. Domain services, the admin app, Redis, RabbitMQ, and MinIO are the architecture-map target, not code yet. Map reflects_commit 81f9787 is behind HEAD. -->

**External systems (in / out):**

| Actor or system | Type | Interaction |
|---|---|---|
| Guest | Person | Reads published Articles, feeds, Comments, counts, and public profiles |
| User | Person | Writes, follows, reacts, bookmarks, messages, and files a Complaint |
| Moderator | Person | Hides, Blocks, handles Complaints, and moves a Category, from the admin panel only |
| Administrator | Person | Manages the catalog, roles, weights, statistics, and the audit trail, and may also hide, Block, and soft-remove |
| Firebase Authentication | System (external) | Signs a person in and proves the staff second factor. It is not the business user store |
| Object storage | System (external in production, MinIO locally) | Holds uploaded image bytes. The media service issues the upload URL |

**Trust boundary.** The gateway is the edge. A Firebase ID token is untrusted until the gateway verifies it. An Article body and a Comment body are untrusted until the owning service validates and sanitizes them. Admin routes accept calls only from the admin origin, and they read the role from the users service on every request. Public-site sign-in does not authorize those routes.

**C4 Context (L1):**

```mermaid
C4Context
    title Blog platform — System Context

    Person(guest, "Guest", "Reads published writing")
    Person(user, "User", "Writes and participates")
    Person(moderator, "Moderator", "Moderates from the admin panel")
    Person(administrator, "Administrator", "Runs the catalog and the audit trail")

    System(platform, "Blog platform", "Publishes Articles, feeds, conversation, and staff actions")
    System_Ext(firebase, "Firebase Authentication", "Signs people in and proves the staff second factor")

    Rel(guest, platform, "Reads", "HTTPS")
    Rel(user, platform, "Writes and participates", "HTTPS")
    Rel(moderator, platform, "Moderates", "HTTPS")
    Rel(administrator, platform, "Administers", "HTTPS")
    Rel(platform, firebase, "Verifies identity tokens", "HTTPS")
```

## 4. Solution strategy

**Target surfaces.** This feature owns three surfaces: `backend-service`, `web-frontend`, and `worker`. The public site and the admin panel are two deployable web apps of the one `web-frontend` surface. There is no mobile app, desktop app, or CLI product. Data stores are not surfaces.

**UI architecture.** The public site is a Next.js hybrid. Article and feed HTML are rendered on the server so a published Article URL works without client JavaScript. The editor, signed-in mutations, and live updates run in the browser. The admin panel is a Vite SPA on `admin.<domain>`, with no server-rendered HTML, because it has no search-engine requirement (`docs/adr/0001-adopt-nodejs-typescript-monorepo.md`). Both apps use HeroUI v3 semantic tokens, TanStack Query for server state, and Zustand for client state. Socket events update the Query cache. They are not a second source of truth. Public routing is the Next.js App Router with a locale prefix. Admin routing is React Router. A single combined app is already excluded by that ADR and by the spec, so this pass does not record a second ADR for it.

**Top strategic choices:**

1. **One owning service per schema, sync at the gateway, events through an outbox.** Synchronous reads and commands cross the gateway over HTTP. A write that emits a fact commits the row and an outbox row together. A worker publishes the outbox to RabbitMQ. Consumers are idempotent. This is `docs/adr/0002-own-data-per-nestjs-service.md` applied to every service this feature adds. No moderation service is added. The service list in the architecture map stays closed.
2. **Read models stay cheap.** My feed is assembled on read. Feed pages are cached in Redis and dropped when a publish, hide, or soft-remove event arrives. The gateway composes one public Article payload. The public site renders that payload to HTML. Those choices serve the cached-read goal of p95 ≤ 100 ms and the uncached-read goal of p95 ≤ 300 ms.
3. **The live path is the queue, then the socket.** The write returns when the owning row and the outbox commit. The realtime gateway consumes the event and pushes it to the open Article or the open Direct message conversation. The View count is not on that channel. This keeps write p95 ≤ 300 ms and live-update p95 ≤ 500 ms on different clocks.
4. **Staff power and reader safety sit at the edge.** Admin routes require the Firebase second-factor claim and a role read from the users service. The audit row is append-only in schema `users`. Embed and raw HTML blocks are rejected. Image bytes go to object storage on a presigned URL. A stale Article save is rejected.

Each later decision traces to one of these four. Tactical detail that would add a service, join across schemas, or push pixels from the write path contradicts this section and belongs in §11 if it ever appears.

## 5. Building block view

The backend is a set of NestJS services behind one gateway. Each service is the only writer of its schema. The public site and the admin panel are separate frontends. Workers run beside the service that owns the rows they touch. The skeleton to copy is `apps/api-gateway` (`src/main.ts` boots NestJS on Fastify and listens on `PORT`, default 3001) and the empty Drizzle entry in `packages/database/src/schema.ts`, which says table definitions are added by the owning NestJS app.

**Internal decomposition:**

```
apps/
├── api-gateway/          exists — HTTP edge, health only today
├── web/                  exists — Next.js App Router shell, no feature folders yet
├── admin/                Vite SPA, added by this feature
├── realtime/             Socket.IO gateway, added by this feature
├── users/                schema users
├── content/              schema content
├── categories/           schema categories
├── media/                schema media
├── comments/             schema comments
├── engagement/           schema engagement — Likes, Views, Bookmarks
├── social/               schema social — Follows of Users and Categories
├── feed/                 schema feed
├── messaging/            schema messages
└── notification/         schema notifications
packages/
├── database/             exists — shared Drizzle client and reversible migrations
├── contracts/            DTO and event envelope, added with the first contract
├── ui/                   HeroUI theme shared by web and admin
├── i18n/                 en, sr-Latn, ru
├── firebase/             verify the ID token and the second-factor claim
├── rabbitmq/             confirms, manual ack, retry, dead letter
├── redis/                cache, locks, sliding-window limits, counters
├── config/               typed env, process exits on invalid env
└── logger/               JSON logs with request and correlation ids
```

Inside each NestJS app the layers are a controller, a service, and a Drizzle module for that app's schema. `apps/web` grows Feature-Sliced folders (`entities`, `features`, `widgets`, `shared`) with the first screen. Business rules do not live in React components. Empty apps are not stubbed ahead of the task that needs them.

A background worker is a process of the owning service. The content outbox relay reads schema `content` only. The engagement view-flush worker reads Redis and writes schema `engagement` only.

**C4 Container (L2):**

```mermaid
C4Container
    title Blog platform — Containers

    Person(guest, "Guest")
    Person(user, "User")
    Person(moderator, "Moderator")
    Person(administrator, "Administrator")

    Container_Boundary(platform, "Blog platform") {
        Container(web, "Public site", "Next.js, React, HeroUI", "SSR Articles and feeds, editor in the browser")
        Container(adminpanel, "Admin panel", "Vite, React, HeroUI", "Moderation, catalog, roles, audit")
        Container(gateway, "API Gateway", "NestJS, Fastify", "Token check, locale, rate limits, composition, routing")
        Container(realtime, "Realtime Gateway", "NestJS, Socket.IO", "Pushes live UI updates")
        Container(users, "User Service", "NestJS", "Profiles, roles, Blocks, audit log")
        Container(content, "Content Service", "NestJS", "Drafts, publish, revisions, sanitize")
        Container(categories, "Category Service", "NestJS", "Topics and three translations")
        Container(media, "Media Service", "NestJS", "Presigned image uploads")
        Container(comments, "Comment Service", "NestJS", "Comments, replies, mentions")
        Container(engagement, "Engagement Service", "NestJS", "Likes, Views, Bookmarks")
        Container(social, "Social Service", "NestJS", "Follows of Users and Categories")
        Container(feed, "Feed Service", "NestJS", "Fresh, Popular, and My feed")
        Container(messaging, "Messaging Service", "NestJS", "Direct messages of two Users")
        Container(notification, "Notification Service", "NestJS", "In-product Notifications")
        Container(workers, "Background workers", "Node.js", "Outbox relay per schema, view flush")
    }

    ContainerDb(postgres, "PostgreSQL", "PostgreSQL 18", "One cluster, one schema per service")
    ContainerDb(redis, "Redis", "Redis 8", "Cache, dedupe, rate limits, counters")
    ContainerQueue(rabbit, "RabbitMQ", "RabbitMQ", "Domain events, at least once")
    ContainerDb(objects, "Object storage", "MinIO or S3", "Uploaded images")
    System_Ext(firebase, "Firebase Authentication", "Identity and staff second factor")

    Rel(guest, web, "Reads", "HTTPS")
    Rel(user, web, "Writes", "HTTPS")
    Rel(moderator, adminpanel, "Moderates", "HTTPS")
    Rel(administrator, adminpanel, "Administers", "HTTPS")
    Rel(web, gateway, "Calls the API", "JSON/HTTPS")
    Rel(adminpanel, gateway, "Calls the admin API", "JSON/HTTPS")
    Rel(web, realtime, "Subscribes to live updates", "WebSocket")
    Rel(gateway, users, "Routes", "HTTP")
    Rel(gateway, content, "Routes", "HTTP")
    Rel(gateway, categories, "Routes", "HTTP")
    Rel(gateway, media, "Routes", "HTTP")
    Rel(gateway, comments, "Routes", "HTTP")
    Rel(gateway, engagement, "Routes", "HTTP")
    Rel(gateway, social, "Routes", "HTTP")
    Rel(gateway, feed, "Routes", "HTTP")
    Rel(gateway, messaging, "Routes", "HTTP")
    Rel(gateway, notification, "Routes", "HTTP")
    Rel(gateway, firebase, "Verifies the ID token", "HTTPS")
    Rel(realtime, firebase, "Verifies the socket token", "HTTPS")
    Rel(users, postgres, "Reads and writes schema users", "Drizzle")
    Rel(content, postgres, "Reads and writes schema content", "Drizzle")
    Rel(categories, postgres, "Reads and writes schema categories", "Drizzle")
    Rel(media, postgres, "Reads and writes schema media", "Drizzle")
    Rel(comments, postgres, "Reads and writes schema comments", "Drizzle")
    Rel(engagement, postgres, "Reads and writes schema engagement", "Drizzle")
    Rel(social, postgres, "Reads and writes schema social", "Drizzle")
    Rel(feed, postgres, "Reads and writes schema feed", "Drizzle")
    Rel(messaging, postgres, "Reads and writes schema messages", "Drizzle")
    Rel(notification, postgres, "Reads and writes schema notifications", "Drizzle")
    Rel(workers, postgres, "Reads its own outbox and flushes view counts", "Drizzle")
    Rel(workers, rabbit, "Publishes the outbox", "AMQP")
    Rel(rabbit, feed, "Delivers domain events", "AMQP")
    Rel(rabbit, realtime, "Delivers domain events", "AMQP")
    Rel(rabbit, notification, "Delivers domain events", "AMQP")
    Rel(feed, redis, "Caches feed pages", "Redis")
    Rel(engagement, redis, "Holds view dedupe and increments", "Redis")
    Rel(workers, redis, "Reads view deltas", "Redis")
    Rel(realtime, redis, "Shares socket state", "Redis")
    Rel(media, objects, "Issues upload URLs", "S3 API")
```

## 6. Runtime view

`sequences` covers every acceptance criterion. This section seeds the three paths the strategy depends on: publish, a staff hide reaching an open reader, and My feed.

**Critical flow 1: Publish an Article.** The response returns when content commits the row and the outbox. Feed cache invalidation follows on the queue.

```mermaid
sequenceDiagram
    actor User
    participant Web as Public site
    participant Gateway as API Gateway
    participant Media as Media Service
    participant Objects as Object storage
    participant Content as Content Service
    participant Workers as Background workers
    participant Rabbit as RabbitMQ
    participant Feed as Feed Service

    User->>Web: types the draft and attaches an image
    Web->>Gateway: asks for an upload URL
    Gateway->>Media: asks for an upload URL
    Media-->>Gateway: returns the upload URL
    Gateway-->>Web: returns the upload URL
    Web->>Objects: stores the image bytes
    User->>Web: publishes
    Web->>Gateway: sends the Article
    Gateway->>Content: asks to publish
    Content->>Content: checks Username, title, text, and one Category
    Content->>Content: commits the Article and the outbox row
    Content-->>Gateway: published
    Gateway-->>Web: published
    Web-->>User: shows the published Article
    Workers->>Rabbit: publishes the outbox event
    Rabbit-->>Feed: delivers article published
    Feed->>Feed: drops the cached Fresh page
```

**Critical flow 2: Hide an Article a reader has open.** The Guest is told the Article is unavailable and is not told that staff hid it. The author still sees the text. The audit append is a second call, so it can fail after the hide is recorded (§11).

```mermaid
sequenceDiagram
    actor Moderator
    participant Admin as Admin panel
    participant Gateway as API Gateway
    participant Content as Content Service
    participant Users as User Service
    participant Workers as Background workers
    participant Rabbit as RabbitMQ
    participant Realtime as Realtime Gateway
    actor Guest

    Moderator->>Admin: hides the Article and gives a reason
    Admin->>Gateway: asks to hide
    Gateway->>Content: hides the Article
    Content->>Content: records the hide and the outbox row
    Content-->>Gateway: hidden
    Gateway->>Users: appends the audit row
    Users-->>Gateway: appended
    Gateway-->>Admin: hidden
    Admin-->>Moderator: confirms the hide
    Workers->>Rabbit: publishes the outbox event
    Rabbit-->>Realtime: delivers article hidden
    Realtime-->>Guest: shows the Article unavailable
```

**Critical flow 3: Open My feed.** A cache hit does not recompute the page. A miss reads Follows and currently published Articles, newest first, each Article once.

```mermaid
sequenceDiagram
    actor User
    participant Web as Public site
    participant Gateway as API Gateway
    participant Feed as Feed Service
    participant Redis as Redis
    participant Social as Social Service

    User->>Web: opens My feed
    Web->>Gateway: asks for My feed
    Gateway->>Feed: asks for the page
    Feed->>Redis: looks up the cached page
    alt cache hit
        Redis-->>Feed: the page
    else cache miss
        Feed->>Social: reads Follows
        Social-->>Feed: followed Users and Categories
        Feed->>Feed: selects published Articles, newest first, each once
        Feed->>Redis: stores the page
    end
    Feed-->>Gateway: one page of Articles
    Gateway-->>Web: the page
    Web-->>User: shows My feed
```

The same realtime shape as flow 2 serves an open Direct message conversation, and only the two Users in it receive the push. A Like count and a Comment count use that shape too. The View count does not.

## 7. Deployment view

Each NestJS app, the Next.js site, and the Vite admin bundle are separate deployables. Workers are processes of the owning service, one relay per schema that emits events, plus the engagement view-flush process. PostgreSQL stays one cluster. Redis, RabbitMQ, and object storage are beside it. Local compose today starts PostgreSQL 18 only. The other stores are added with the first service that needs them, not as empty infrastructure ahead of that task.

The public site and the admin panel are different origins. Admin CORS allows the admin origin only. The public bundle does not contain the admin code.

**Monitoring:**

- Server timing for write p95, cached-read p95, and uncached-read p95, on publish, Comment, Like, Direct message, feed, and Article reads.
- Time from a Like, Comment, or hide being recorded to the open Article view changing. Alert when the oldest unpublished outbox row is older than 500 ms, because that is the live-update budget.
- Monthly share of successful published-Article reads, against 99.9%.
- JSON logs with request id and correlation id on the gateway and on each service.

**Scaling thresholds:**

- One replica of each service is the starting topology.
- Add a replica of the public site or the feed service when cached-read p95 goes above 100 ms or published-Article read availability falls below 99.9%.
- Keep one PostgreSQL cluster until a service's schema must move for that same availability target. No partition key is chosen in this release.
- Feed pages hold 20 Articles. Cursor pagination is the only list shape for feeds.

The first Administrator is inserted by an operator seed in the users service before the admin panel is used. The panel has no route that creates that first Administrator.

## 8. Crosscutting concepts

Repo conventions apply. The rows below are the feature's use of them.

| Concept | Convention | Where defined |
|---|---|---|
| Logging | JSON logs with request id and correlation id | `CLAUDE.md`, `packages/logger` when added |
| Authentication | Firebase ID token verified at the gateway. Staff routes also require the second-factor claim. Public sign-in does not open admin routes | Spec §6.1, brief §6.1 and §61.2 |
| Authorization | Role is read from the users service on every admin request, not from a token claim. A User changes and soft-removes only their own Article. Bookmark lists and Direct messages are visible only to their owner | Spec §6.1 |
| Error handling | `{ "error": { "code", "params" } }`. A stale Article save uses `ARTICLE_VERSION_CONFLICT` | `CLAUDE.md`, ADR 0010 |
| ID strategy | App-generated UUIDv7. Firebase UID is a lookup key | `docs/adr/0003-use-drizzle-and-uuidv7.md` |
| Internationalisation | Interface languages `en`, `sr-Latn`, `ru`, English fallback. Content language is a separate field. A User may limit feed Content languages. A Guest has no such limit | Spec AC-04, AC-46 |
| Theme | Light, dark, or system. System is the default. The choice is stored and applied on the public site and on the admin panel. No hard-coded palette colors in feature components | Spec AC-04, AC-55 |
| Observability | Server timing on the latency rows in §10. Tracing at the gateway boundary when `packages` observability lands | §7 |
| Events | Envelope fields `eventId`, `correlationId`, `causationId`, `timestamp`, `producer`, `eventVersion`. Outbox in the owning schema. Idempotent consumers | `docs/adr/0002-own-data-per-nestjs-service.md`, ADR 0011 |
| Rate limiting | Redis sliding window at the gateway. Comments 20 per minute, Likes 60 per minute, Follows 30 per minute, Direct messages 60 per minute, Article edits 60 per minute, image attachments 20 per hour. Anonymous reads 60 per minute per visitor. An Administrator can change these limits | Spec §6.1, ADR 0009 |
| View counting | A View counts after the Article stays visible for 3 seconds. The same viewer does not add another View for 30 minutes. A Guest is the same viewer for the same browser session. A User is the same viewer when that User returns. Redis holds the dedupe key and the increment. A worker flushes the delta to schema `engagement` | Spec §6, spec §8 default accepted in this pass, ADR 0006, ADR 0012 |
| Article body | Editor.js JSON is the editable source. The content service validates and sanitizes on write, stores rendered HTML for SSR, and rejects embed and raw HTML blocks | Brief §8, ADR 0005, ADR 0007 |
| Lists | Cursor pagination. A feed page is 20 Articles | Spec §6, `docs/adr/0003-use-drizzle-and-uuidv7.md` |
| Comments | Stored as a tree with parent and depth. Replies past the third level are shown flat | Spec AC-17 |
| Reader-unavailable | A draft, a hidden Article, and a soft-removed Article are one public unavailable state. The reader is not told which. The author still sees the text and the state. Staff see the full text only in the admin panel | Spec AC-27, AC-38, AC-45 |
| Block | A blocked User cannot publish, Comment, Follow, Like, Bookmark, or send a Direct message. The User can read, edit their own Article, soft-remove their own Article, and file a Complaint. Already published Articles stay visible | Spec AC-31, AC-32 |
| Admin session | A Moderator or an Administrator signs in again after 30 idle minutes | Spec §6 |
| First Administrator | Operator seed in the users service. The panel cannot create the first one, and it cannot remove the last one | Spec AC-51, AC-52 |

The two spec §8 items that were due before design are closed here: a View waits 3 seconds of visibility, and one anonymous visitor is slowed after 60 reads per minute. Starting Popular feed weights stay open (§11).

## 9. Architecture decisions

| # | Title | Status | Section |
|---|---|---|---|
| 0001 | Assemble My feed on read | Accepted | §4 |
| 0002 | Append the staff audit log in the users schema | Accepted | §4 |
| 0003 | Compose the public Article read in the gateway | Accepted | §4 |
| 0004 | Cache feed pages in Redis | Accepted | §4 |
| 0005 | Render the draft preview on the editor screen | Accepted | §4 |
| 0006 | Leave view counts off the live channel | Accepted | §4 |
| 0007 | Reject embed and raw HTML blocks | Accepted | §4 |
| 0008 | Upload article images with presigned URLs | Accepted | §5 |
| 0009 | Count rate limits with a sliding window | Accepted | §8 |
| 0010 | Reject a stale Article save | Accepted | §8 |
| 0011 | Relay the outbox from a worker process | Accepted | §7 |
| 0012 | Flush view increments from Redis | Accepted | §8 |

ADR files live under `docs/features/blog-platform/adr/`. Foundation decisions stay in `docs/adr/0001` through `docs/adr/0003` and are constraints in §2, not rows here.

## 10. Quality requirements

Numbers below are copied from spec §6. The 1 second figures in spec §7 are release watches for the same live path. They are not a second performance target.

**QG-1. Cached read performance**

- **When:** a Guest or a User opens a feed or an Article that is already in cache.
- **Then:** latency p95 of a cached feed or Article read is ≤ 100 ms.
- **How verify:** server timing of cached reads.

**QG-2. Live update**

- **When:** a Guest or a User is looking at a published Article, and someone records a Like, a Comment count change, a new or hidden Comment, or a hide.
- **Then:** latency p95 until that open view changes is ≤ 500 ms, measured from the action being recorded to the open Article view changing. The release watch for the same path is the 1 second KPI in spec §7. The View count does not have to change on that open view.
- **How verify:** time from the action being recorded to the open Article view changing.

**QG-3. Availability of published-Article reads**

- **When:** readers request published Articles across a month.
- **Then:** availability of published-Article reads is 99.9%, as the monthly share of successful reads.
- **How verify:** monthly share of successful reads.

**QG-4. Write latency**

- **When:** a User publishes, Comments, Likes, or sends a Direct message.
- **Then:** latency p95 of that write is ≤ 300 ms.
- **How verify:** server timing of those writes.

**QG-5. Uncached read**

- **When:** a feed or Article read misses the cache.
- **Then:** latency p95 of an uncached feed or Article read is ≤ 300 ms.
- **How verify:** server timing of reads that miss the cache.

**QG-6. Draft preview**

- **When:** an author keeps a keystroke in the open draft.
- **Then:** latency p95 of draft preview is ≤ 300 ms, from that keystroke being kept to the second preview on the editor screen showing it.
- **How verify:** time from a keystroke being kept to the author's second preview showing it.

**QG-7. Largest content paint**

- **When:** a reader opens a published Article page in the field.
- **Then:** published Article page largest content paint is ≤ 2.5 s.
- **How verify:** field measurement of the published Article page.

**QG-8. Feed page size**

- **When:** a Guest or a User opens one page of a feed.
- **Then:** the page holds 20 Articles.
- **How verify:** count returned for one page of a feed.

**QG-9. View window**

- **When:** the same viewer opens an Article again inside 30 minutes.
- **Then:** the same-viewer View window is 30 minutes, and a second View inside the window is not counted.
- **How verify:** a second View from the same viewer inside the window is not counted.

**QG-10. Admin idle session**

- **When:** a Moderator or an Administrator is idle on the admin panel.
- **Then:** admin session idle is 30 minutes, after which they must sign in again.
- **How verify:** a Moderator or Administrator must sign in again after 30 idle minutes.

**QG-11. Contrast**

- **When:** body text and controls are shown in the light Theme and in the dark Theme.
- **Then:** text contrast is ≥ 4.5:1 for body text and ≥ 3:1 for large text and controls.
- **How verify:** check against WCAG 2.2 AA in light and dark.

## 11. Risks and technical debt

| Risk / debt | Severity | Mitigation | Owner |
|---|---|---|---|
| Open architectural decision: starting weights of the Popular feed score | Open question | Resolve before sdd:tasks. Until then the score treats Views, Likes, Comments, and Bookmarks as equal weights, and age lowers the score. Spec §8 already assigns this default and this due date | PM |
| Open architectural decision: release deadline | Open question | Resolve before sdd:tasks. The spec states no date, so deployment ordering in §7 has no calendar | PM |
| The hide can commit and the audit append can still fail, because they are two services and two schemas | Medium | The gateway retries the audit append. Alert when a staff command has no matching audit row. The trail stays append-only either way | Tech Lead |
| Outbox lag can miss the 500 ms live-update budget while the write itself stayed inside 300 ms | High | Alert when the oldest unpublished outbox row is older than 500 ms. The realtime gateway consumes only after the worker publishes | Tech Lead |
| A Redis failure before view flush loses increments that are not in Postgres yet | Medium | Short flush interval. Redis persistence on the view-counter keys. The durable count remains the engagement row | Tech Lead |
| Local compose has PostgreSQL only. Redis, RabbitMQ, MinIO, and the domain services are not in the workspace yet | Medium | Add each store and each app with the task that first needs it. Do not stub the full service list in the skeleton | Tech Lead |
| The architecture map still describes an empty repository at `reflects_commit` 81f9787 | Low | This SAD treats the scaffold as the brownfield and the map's target containers as the constraint. A later survey refresh can move `reflects_commit` | Tech Lead |
| Security review has not run. Staff powers, the second factor, and confidential messages are in this release | High | Spec §6.1 marks the review required. Hold release on that review | Security Lead |
| `docs/design-system.md` does not exist yet. HeroUI is a convention, not a package in the workspace | Low | `packages/ui` arrives with the first screen. Feature components use semantic tokens once that package exists | Tech Lead |

**Accepted debt (acceptable in v1, plan to fix later):**

- Earlier Article versions stay recorded and are not browsable.
- The View count on an open Article can lag. The live channel does not push it.
- Popular weights use the equal-weight default until the §11 question closes.
- Embeds and raw HTML stay rejected for this release.
- Email and phone alerts stay out. Notifications are in-product only.
- The audit row is not in the same database transaction as the staff command.

## 12. Glossary

Canonical domain terms live in repo-root `CONTEXT.md`. There is no `docs/features/blog-platform/CONTEXT.md`. The meanings below match that glossary. Technical terms at the bottom are local to this SAD.

| Term | Meaning |
|---|---|
| Administrator | A signed-in person who manages categories, users, moderation, settings, statistics, role assignment, and the audit log, and does this only from the admin panel. |
| Article | A piece of writing owned by one User, filed under exactly one Category, with its own Content language. It starts as a draft, becomes published, may be hidden by a Moderator, and may be soft-removed so readers no longer see it while the record remains. |
| Block | A Moderator or Administrator stopping a User from publishing, commenting, following, liking, bookmarking, and sending Direct messages. Already published Articles stay visible. |
| Bookmark | A private mark a User places on a published Article. Only that User can see their Bookmarks. |
| Category | A topic an Administrator names and translates into English, Serbian Latin, and Russian. An Article belongs to exactly one Category. |
| Comment | A User's public remark on a published Article. It may reply to another Comment, receive a Like, and mention a User. Replies past the third level remain stored and are shown flat. |
| Complaint | A User's report of an Article or a Comment. It stays open until a Moderator or an Administrator hides that Article or Comment, or dismisses the report and leaves the piece visible. |
| Content language | The language an Article is written in, chosen by its author from English, Serbian Latin, or Russian. |
| Direct message | A private message in a conversation of exactly two Users. |
| Fresh feed | The list of published Articles, newest first, visible to a Guest and to a User. |
| Guest | A person who is not signed in and may read published material. |
| Interface language | The language of menus, buttons, system text, and Notifications: English, Serbian Latin, or Russian. English is the fallback. |
| Like | One User's endorsement of one Article or one Comment. Repeating it removes that endorsement. |
| Moderator | A signed-in person who hides Articles and Comments, blocks Users, handles Complaints, and changes an Article's Category, only from the admin panel. |
| My feed | The list of published Articles from Users and Categories a given User follows, newest first. Only a signed-in User has this list. |
| Notification | An in-product notice to a User about a reply, a mention, a new follower, or a new Direct message. |
| Popular feed | The list of published Articles ordered by a score of Views, Likes, Comments, Bookmarks, and age. |
| Theme | The appearance choice light, dark, or system. System is the default. |
| User | A signed-in person who is both a reader and an author. |
| Username | The required public name a User chooses. No two Users share one. |
| View | A count added when an Article stays open and visible for a few seconds. The same viewer does not add another View for 30 minutes. |
| Outbox | A row written in the same database transaction as the business row, later published to RabbitMQ by a worker of that service. |
| Presigned URL | A time-limited upload URL from the media service. The browser sends image bytes to object storage with it. |
| Sliding window | A rate-limit count over the last minute that moves with time, rather than resetting on the clock minute. |

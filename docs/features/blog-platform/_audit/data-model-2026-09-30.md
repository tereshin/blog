---
status: Draft
owner: "Backend Lead"
updated_at: "2026-09-30"
feature_size: XL
---

# Data-model audit — blog-platform — 2026-09-30

Migrations are staged. They are not in the live `packages/database/migrations/` tree. `implement` promotes them.

## Staged files

- `docs/features/blog-platform/migrations/01_create_users.up.sql`
- `docs/features/blog-platform/migrations/01_create_users.down.sql`
- `docs/features/blog-platform/migrations/02_create_categories.up.sql`
- `docs/features/blog-platform/migrations/02_create_categories.down.sql`
- `docs/features/blog-platform/migrations/03_create_content.up.sql`
- `docs/features/blog-platform/migrations/03_create_content.down.sql`
- `docs/features/blog-platform/migrations/04_create_media.up.sql`
- `docs/features/blog-platform/migrations/04_create_media.down.sql`
- `docs/features/blog-platform/migrations/05_create_comments.up.sql`
- `docs/features/blog-platform/migrations/05_create_comments.down.sql`
- `docs/features/blog-platform/migrations/06_create_engagement.up.sql`
- `docs/features/blog-platform/migrations/06_create_engagement.down.sql`
- `docs/features/blog-platform/migrations/07_create_social.up.sql`
- `docs/features/blog-platform/migrations/07_create_social.down.sql`
- `docs/features/blog-platform/migrations/08_create_messages.up.sql`
- `docs/features/blog-platform/migrations/08_create_messages.down.sql`
- `docs/features/blog-platform/migrations/09_create_notifications.up.sql`
- `docs/features/blog-platform/migrations/09_create_notifications.down.sql`
- `docs/features/blog-platform/migrations/10_create_feed.up.sql`
- `docs/features/blog-platform/migrations/10_create_feed.down.sql`
- `docs/features/blog-platform/migrations/11_seed_rate_limits.up.sql`
- `docs/features/blog-platform/migrations/11_seed_rate_limits.down.sql`

## Promote-time convention hint

The live tree is one Drizzle journal, `packages/database/migrations/meta/_journal.json`. The only entry is `0000_baseline` (`idx` 0). Forward files are `<tag>.sql` and rollbacks are the sibling `<tag>.down.sql`. `drizzle-kit migrate` splits a forward file on `--> statement-breakpoint` and runs the file inside a transaction. The custom rollback runs the whole `.down.sql` as one script, so down files do not contain breakpoints.

`implement` assigns the real tags at promotion, in this ordinal order. If nothing else is promoted first, these become `0001` through `0011`.

The architecture map asks for one migration history per schema. The live tree is still one shared journal. These staged files are one ordinal per schema, plus the rate-limit seed, so a later split still has a boundary. Promotion into the shared journal is what the live tool can apply today. That divergence is not changed here.

## Conventions followed

- App-generated UUIDv7 primary keys. Firebase UID is a unique lookup on `users.users`, not the primary key. ADR 0003.
- One schema per service: `users`, `categories`, `content`, `media`, `comments`, `engagement`, `social`, `messages`, `notifications`, `feed`. ADR 0002 and `sad.md` §5.
- No foreign key across schemas. Inside a schema, every foreign key has an index and uses `ON DELETE RESTRICT`, because a soft-removed Article and a hidden Comment stay in the database.
- Snake case tables and columns, matching the brief's table names where this release still has that table.
- `created_at` / `updated_at` as `timestamptz NOT NULL DEFAULT now()` on rows that are updated in place. Append-only rows have `created_at` only. The live tree has no columns to copy. The product brief lists these timestamps, and the default keeps a row from being inserted without a time.
- Article removal is a status (`draft`, `published`, `hidden`, `soft_removed`), not `deleted_at`. The spec separates a Moderator hide from an author withdraw. `removed_by` records `author` or `staff`.
- Theme and Interface language are not columns. `sad.md` §6.
- My feed has no inbox table. ADR 0001. Feed pages are Redis. ADR 0004. Schema `feed` stores only `popular_weights`.
- Staff audit is one append-only table in schema `users`. ADR 0002. A trigger rejects `UPDATE` and `DELETE`, because the local database owner would bypass a grant.
- Rate-limit numbers are rows, so an Administrator can change them without a new migration. ADR 0009. The counters stay in Redis.
- View dedupe and the unflushed increment stay in Redis. ADR 0012. Postgres stores the flushed `view_count` only.
- The previous Article version is `content.article_revisions`. ADR 0010. There is no version-list query.
- Optimistic lock is `content.articles.version`.
- Complaints live with the piece: Article complaints in `content`, Comment complaints in `comments`. The open list is two reads. The gateway merges them. There is no moderation schema.

## Deliberate divergences

- No `CHECK` and no Postgres enum. The brief writes `ENUM` for role, language, and article status. The live migrations contain no `CHECK` and no enum. The owning service checks the allowed values. One pair-order `CHECK` on `conversation_pairs` was considered and left out for the same reason. The messaging service stores the lower user id in `user_id_low`.
- `users.user_follows(following_id)` from the brief's index list is not created. No sequence reads "who follows this user". The Follow read for My feed is `follower_id`, which is the leading primary-key column.
- The brief's `deleted_at` on users, articles, comments, and messages is not a column. This release soft-removes Articles by status and hides Comments by status. Users and Direct messages are not soft-deleted here.
- The brief's article statuses `UNLISTED`, `ARCHIVED`, and `DELETED` are not stored. The spec's states are the four values above.
- `user_settings.theme` and `user_settings.locale` from the brief are not columns.
- Audit columns `ip` and `user_agent` from the brief are not stored. The spec's personal-data list for the trail is the staff actor. `request_id`, `before_state`, and `after_state` are kept.
- Cover, external links, privacy flags, comment edit/delete, message edit/delete, and message attachments are not tables. No acceptance criterion in this release reads them.
- Starting Popular weights are the equal-weight seed (all `1`), which `sad.md` §11 already uses until that question closes. The numbers are a row, not a TBD column.

## Drift

`packages/database/src/schema.ts` exports an empty object. No Nest service defines a domain struct yet. There is no `field-without-column`, `column-without-field`, `type-mismatch`, or `nullability-mismatch`. No `_drift/` SQL.

## Breaking changes

Greenfield. No expand, backfill, or contract sequence. The scratch apply created every object and the matching down scripts removed every schema. That apply used a throwaway database and dropped it. The `blog` database and the live migration tree were not changed.

## TBD

None.

## Self-check

1. Naming matches the schema-per-service snake case already recorded in the architecture map and the brief.
2. Every `CREATE TABLE` has a `DROP TABLE`. Every `CREATE INDEX` has a `DROP INDEX`. The down scripts ran after the up scripts on a scratch database and left none of the ten schemas.
3. Every `REFERENCES` column is the leading column of a primary key, a unique key, or a secondary index.
4. The divergences above are the places this model does not copy the brief verbatim. Each one follows the spec, an Accepted ADR, or the empty live migration tree.

## Next stage

`api blog-platform`.

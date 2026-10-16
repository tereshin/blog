# Changelog

Notable changes to the platform are recorded here, newest version first.
Versions apply to the platform as a whole. Entries describe user-visible changes
and operational requirements rather than individual commits.

## [1.0.1]

This version contains the current changes on top of 1.0.0.

### Added

- Maintenance mode in superadmin access settings: persisted in content-service,
  blocks pages and API requests with HTTP 503 for guests and members while
  preserving administrator access and sign-in. Requires the
  `20261016_settings_maintenance.sql` content-service migration.

- Configurable achievement badges with image uploads, automatic permanent awards,
  retroactive evaluation, and archiving in superadmin settings. Badge rules belong
  to content-service; the shared package contains their data contracts.

- Superadmin management of informational pages: block content, drafts, preview,
  publication, unpublication, deletion, and public `/pages/{slug}` routes.
- Custom sidebar sections with ordered links to published pages or external URLs,
  SVG icons, and collapsible sections.
- Layout settings to show or hide built-in navigation entries and popular comments.
- Configurable welcome content with a block editor.
- Inline comment mentions with participant suggestions and profile links.
- Published pages in SEO routes and sitemaps; page update and deletion events.
- Buttons block in the editor: one to six external link buttons with HeroUI sizes
  and variants, text, an `http(s)` address, and an optional SVG icon checked
  against the navigation icon allowlist. Older clients skip the new block type.

### Changed

- Deleted accounts are excluded from Discovery, search, profile directories,
  follow lists, mention suggestions, profile URLs, and profile sitemaps. Deletion
  propagates as a persistent tombstone; published materials remain available.
  A separate durable consumer replays deletion events acknowledged by older
  content-service versions so those profiles disappear after an upgrade. Identity
  also queues fresh deletion snapshots at startup, repairing stale copies without
  relying on a one-time migration or retained broker history.
- Public HTML includes metadata, canonical URLs, JSON-LD, and readable content
  for browsers and crawlers. Topic pages include public article previews and links.
  nginx routes application pages and crawl documents through the gateway while
  continuing to serve static assets directly.
- Selected values in large select fields are vertically centered.

- Firebase Google sign-in allows the Google API loader in the page CSP.
  Gateway uses `Cross-Origin-Opener-Policy: same-origin-allow-popups` so Google
  and GitHub popup sign-in can return its result to the application.
- Member administration uses a wide table with cursor pagination, access-level
  filters, case-insensitive name/email search, profile-name and access editing,
  blocking, and account deletion. Deletion revokes sessions and prevents sign-in
  while preserving published content. Superadmins can confirm an account email
  in Firebase and the platform; the member table shows email verification status.
- Moderation reporters display linked profile names instead of user UUIDs.

- Profile status selection uses the same accessible icon grid as reactions.
- Navigation and reloads start at the top; returning from an article restores the
  originating feed position without replaying stale offsets.
- Discussion anchors scroll smoothly and highlight linked comments temporarily;
  comment author names and avatars open profiles, also addressable by user UUID.
- Guests no longer see the mobile Write button; desktop behavior is unchanged.

- CI integration tests bound service and file concurrency to reduce container
  contention. Page concurrency checks prepare both database connections and log
  server errors instead of hiding the cause of an HTTP 500 response.

- E2E checks isolate admin viewport and access cases, preserve mock guest sessions,
  and wait for loaded content, editor windows, and conversation layout before
  asserting results.
- Comment composers keep their expanded layout when focus moves away and collapse
  after sending, so nearby Reply actions stay under the pointer during a click.

- Replaced the Rating section with Discovery: inline search, ranked blog and topic
  previews, full lists, and follow controls. Legacy Rating and Search links redirect
  to Discovery; SEO routes and sitemaps use the new addresses.
- Separated mobile navigation from desktop header actions, with Discovery search.
  The account button shows the member's avatar. The cover control stays readable
  on touch screens. Existing layout and SEO settings remain compatible.
- The mobile messages tab uses the chat icon.
- Narrow screens no longer open a side navigation drawer. The bottom bar is the
  mobile navigation; the left column stays from 768px.
- Full blog and topic lists no longer repeat a Discovery link above the title.
  Back in the header returns to Discovery.
- The header shows Back without the current page title. Enter in a comment
  inserts a line break.
- Showing seen posts keeps the strip in place; dismissing it hides those posts again.

- Unified administration screens, navigation, forms, and settings sections.
- Separated Discovery and editor state into model hooks, isolated document rendering
  components, and routed content modules through their public interfaces.
- Shared document rendering, sanitization, and editor components for articles,
  pages, and welcome content; updated person cards and embed URL validation.
- Editor attachments accept txt, csv, md, rtf, pdf, docx, xlsx, jpg, png, and gif.
  The attachment card follows the light and dark theme.
- Updated article publishing controls, comment composition and attachments,
  profile comment rows, author status icons, and reaction presentation.
- Adjusted content widths, shell geometry, and responsive styling.
- Reaction selection now uses a compact, scrollable five-column icon grid.
- Updated Russian, English, and Serbian interface translations for the new controls.
- SVG favicon validation now accepts metadata and validated embedded PNG images.
- Image upload and save failures are reported through toast notifications.
- Table blocks in article documents use `with_headings`; Editor.js still sends `withHeadings`, and the editor maps it at the adapter boundary.
- Verb-style mutation routes now have resource aliases: `DELETE /v1/sessions/current` (logout), `PATCH /v1/notifications` and `PATCH /v1/notifications/{id}` (read state), `PATCH /v1/conversations/{id}` (read), `PUT`/`DELETE /v1/users/{id}/restriction`, and `POST /v1/media/social-cover-previews`. Previous paths remain.
- Long feeds, bookmarks, comments, conversations, people lists, and notifications
  virtualize after a size threshold. Bookmarks and notifications load by cursor.
- A Postgres connection closed by the server no longer crashes the process while
  the pool is shutting down. The next query opens a fresh connection.
- On narrow screens the header actions stay fixed to the bottom of the window.
  The header blur no longer pulls that bar up over the menu and back buttons.

### Removed

- The dedicated About page and its settings; informational content is managed
  through pages and custom navigation.

### Deployment

- Apply content-service and discussion-service `20261016_deleted_user_copies.sql`,
  deploy their updated consumers, then apply identity-service
  `20261016_republish_deleted_users.sql` to propagate previously deleted accounts.
- Deploy web and gateway together for server-rendered HTML. Gateway reads the web
  template from `WEB_ASSETS_URL` (`http://web:8080` in Compose); external routing
  must send application HTML to web or gateway, and `/assets/*` to web.

- Apply identity-service migration `20261016_deleted_users.sql` before deploying
  account deletion and the updated authentication and member queries.

- Profile responses expose all built-in and configurable award IDs in `badges`.
  Pre-production contracts use one format without older-client compatibility paths.

- Apply content-service migration `20261014_profile_badges.sql` to initialize the
  badge catalog and preserve currently eligible legacy awards. The service runs
  a badge reconciliation worker at startup and every five minutes.

- Apply the new content-service migrations for pages, navigation sections, SVG
  navigation icons, shell visibility, welcome content, and removal of About settings.
- Apply the discussion-service migration for participant slugs used by mentions.
- Apply idempotency-key tables: content-service, identity-service, and
  notification-service `20261014_idempotency.sql`. Mutating requests continue to
  accept `X-Idempotency-Key`; http-kit now parses that header on every service.

## [1.0.0]

Initial baseline: all changes already pushed to `origin/main` through commit
`d9f05890c8d99e910b70880aeb9ad7df526b728d` (commit date: 2026-10-12).
This is a retrospective version assignment, not a recorded release date or Git tag.

### Added

- Public and subscription feeds, topics, article pages, bookmarks, and search.
- Block-based article editing, drafts, audience controls, media attachments,
  external previews, SEO metadata, and social covers.
- Threaded comments, reactions, views, shares, and live article and discussion updates.
- Member profiles, subscriptions, reputation, badges, ratings, direct messages,
  and notifications.
- Firebase Authentication with gateway cookie sessions, member permissions,
  moderation, reports, and account restrictions.
- Administration of site settings, topics, reactions, badges, registration,
  publication permissions, and About content.
- Responsive layout, light and dark themes, and Russian, English, and Serbian UI.
- A React frontend and service backend with PostgreSQL, NATS JetStream, MinIO,
  shared contracts, Docker Compose environments, seed data, and automated checks.

## Maintenance

- Update the active unreleased version in the same change as the implementation.
  Keep entries concise, group related work, and omit empty categories.
- Keep 1.0.0 as the pushed baseline and continue collecting the current work under
  1.0.1 until it is released. A commit alone does not mark a release.
- On release, replace `Unreleased` with the actual release date (`YYYY-MM-DD`)
  and record the release commit or tag. Create the next unreleased section when
  work on the next version begins.
- Preserve released entries. Mention migrations, configuration changes, removals,
  and compatibility impacts when relevant. Do not claim checks passed unless run.

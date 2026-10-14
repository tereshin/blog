# Changelog

Notable changes to the platform are recorded here, newest version first.
Versions apply to the platform as a whole. Entries describe user-visible changes
and operational requirements rather than individual commits.

## [1.0.1]

This version contains the current changes on top of 1.0.0.

### Added

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

- Replaced the Rating section with Discovery: inline search, ranked blog and topic
  previews, full lists, and follow controls. Legacy Rating and Search links redirect
  to Discovery; SEO routes and sitemaps use the new addresses.
- Separated mobile navigation from desktop header actions, with Discovery search.
  The account button shows the member's avatar. The cover control stays readable
  on touch screens. Existing layout and SEO settings remain compatible.
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

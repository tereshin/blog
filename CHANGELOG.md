# Changelog

Notable changes to the platform are recorded here, newest version first.
Versions apply to the platform as a whole. Entries describe user-visible changes
and operational requirements rather than individual commits.

## [1.0.1]

This version contains the current changes on top of 1.0.0.

### Added

- Superadmin management of informational pages: block content, drafts, preview,
  publication, unpublication, deletion, and public `/pages/{slug}` routes.
- Custom sidebar sections with ordered links to published pages or external URLs,
  SVG icons, and collapsible sections.
- Layout settings to show or hide built-in navigation entries and popular comments.
- Configurable welcome content with a block editor.
- Inline comment mentions with participant suggestions and profile links.
- Published pages in SEO routes and sitemaps; page update and deletion events.

### Changed

- Unified administration screens, navigation, forms, and settings sections.
- Shared document rendering, sanitization, and editor components for articles,
  pages, and welcome content; updated person cards and embed URL validation.
- Updated article publishing controls, comment composition and attachments,
  profile comment rows, author status icons, and reaction presentation.
- Adjusted content widths, shell geometry, and responsive styling.
- Updated Russian, English, and Serbian interface translations for the new controls.
- SVG favicon validation now accepts metadata and validated embedded PNG images.
- Image upload and save failures are reported through toast notifications.

### Removed

- The dedicated About page and its settings; informational content is managed
  through pages and custom navigation.

### Deployment

- Apply the new content-service migrations for pages, navigation sections, SVG
  navigation icons, shell visibility, welcome content, and removal of About settings.
- Apply the discussion-service migration for participant slugs used by mentions.

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

# Changelog

New features and bug fixes, newest version first. An entry describes what a
reader, member, or administrator can do, or what stopped going wrong.

## [1.0.4]

### Added

- Readers can start sign-in with only their email. The dialog moves between
  steps, supports registration and password recovery with six-digit email
  codes, and signs them in after setting a password.

- Readers in Singapore can access the production site.

### Fixed

- The sign-in dialog loads the enabled sign-in methods on the live site.

## [1.0.1]

Current changes since 1.0.0.

### Added

- Readers can click the view count on article cards and article pages to see
  views, reactions, comments, and bookmarks in a statistics dialog.

- Account and article menus show an icon beside each item.

- Administrators can adjust compression, quality, format, and maximum dimensions
  for new images, connect S3 or Cloudflare R2 storage, and test the connection.

- Authors can add image galleries, arrange photos, and add a caption. Readers
  can scroll through the gallery to the card edges with a trackpad and open
  photos in a full-screen viewer. Arrows appear only when scrolling is available.

- Administrators can set a Meta Pixel ID to track page views, or clear it to
  disable tracking.

- Selecting a reaction sends it floating upward with a soft fade. Reaction,
  comment, bookmark, and view counts roll smoothly when their values change.
- Administrators can turn on maintenance mode. Guests and members see a closed
  site; administrators can still sign in.
- Administrators can set up achievement badges: upload an image, award them
  automatically, including for earlier activity, and archive a badge. An award
  stays on the profile.
- Administrators can write informational pages, preview them, and publish or
  remove them. Sidebar sections can link to those pages or to external sites,
  with an icon, and a section can be collapsed. Published pages appear in the
  site map. The separate About page is replaced by these pages and sections.
- Administrators can edit the welcome screen in the block editor and choose
  which built-in navigation items and the popular-comments block are shown.
- A comment can mention a participant. Suggestions appear while typing, and the
  mention opens that profile.
- The editor can insert one to six link buttons, each with text, size, style,
  an address, and an optional icon.
- Discovery replaces Rating: search, ranked blogs and topics, full lists, and
  follow. Previous Rating and Search addresses open Discovery.
- Member administration is a table with search, access filters, profile-name
  and access editing, blocking, deletion, and email confirmation. A deleted
  account cannot sign in and disappears from Discovery, search, profiles,
  follow lists, and mentions. Published posts remain.
- On a phone, navigation is a bottom bar with Discovery search. The account
  button shows the member's avatar.
- The editor accepts text, CSV, Markdown, RTF, PDF, Word, Excel, and image
  attachments.

### Fixed

- A temporary failure while checking an uploaded image no longer reports its
  address as invalid.

- Every article page visit counts as a view, including repeat visits and visits
  by guests, authors, and moderators.

- Profile and topic pages keep the same loading placeholder while the page and
  its data load. Reaction buttons and action buttons on article cards and pages
  keep their opacity while requests are pending.

- Meta Pixel loads from the page head before the application starts, with one
  initial page view and subsequent views on navigation.

- Updating an article after leaving a page open no longer interrupts the site
  with a 502 error.

- Article cards show the first two blocks in their original order and formatting.
  Cards and article pages keep their original font sizes. The editor matches
  the published article's text, headings, and lists.
- Google and GitHub sign-in returns to the site.
- A page opens at the top. Leaving an article returns to the same place in the
  feed. A link to a comment scrolls to it and highlights it. The author's name
  and avatar open the profile. Discussion links stay aligned when article images
  load after the initial scroll.
- On a phone, guests have no Write button. Header actions stay at the bottom
  of the screen and remain tappable. The messages tab shows the chat icon, and
  the cover control stays readable. Blog and topic lists start with the title.
  Back returns to Discovery, and the header shows Back on its own.
- The comment field stays open while you move to Reply and closes after the
  comment is sent. Enter starts a new line. The seen-posts bar stays until it
  is dismissed.
- A long dropdown centers the selected value. A failed image upload shows a
  notification. Attachment cards follow the light and dark theme. Article
  tables keep their header row. A favicon with extra image data is accepted.
  Moderation shows the reporter's name.

## [1.0.0]

Baseline of everything already on `origin/main` through commit
`d9f05890c8d99e910b70880aeb9ad7df526b728d` (2026-10-12).
This marks the baseline. It is not a release date or a Git tag.

### Added

- Feeds, topics, article pages, bookmarks, and search.
- An article editor with blocks, drafts, audience, attachments, link previews,
  and social covers.
- Comments, reactions, views, shares, and live updates.
- Profiles, subscriptions, reputation, badges, ratings, messages, and
  notifications.
- Sign-in, member permissions, moderation, reports, and account restrictions.
- Administration of site settings, topics, reactions, badges, registration,
  who can publish, and the About page.
- A layout that adapts to the screen, light and dark themes, and Russian,
  English, and Serbian.

## How to write an entry

Use this shape for the current version:

```markdown
## [x.y.z]

### Added

- What a reader, member, or administrator can newly do.

### Fixed

- What that person can rely on now.
```

- Update the current unreleased version in the same change as the feature or fix.
- **Added** is a new capability. **Fixed** is a bug a person could notice.
- Write one bullet per outcome, in plain language. Group related details.
- Omit a section when it has no bullets.
- Leave out commits, services, migrations, configuration, tests, refactors, and
  API paths.
- Keep 1.0.0 as the baseline. Keep collecting under 1.0.4 until that version is
  released. A commit does not release a version.
- On release, add the date (`YYYY-MM-DD`) and open the next version. Leave
  released text as it was. Do not invent dates, tags, or test results.
- An edit that only changes this file does not need its own entry.

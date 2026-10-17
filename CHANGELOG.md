# Changelog

New features and bug fixes, newest version first. An entry describes what a
reader, member, or administrator can do, or what stopped going wrong.

## [1.0.1]

Current changes since 1.0.0.

### Added

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

- Google and GitHub sign-in returns to the site.
- A page opens at the top. Leaving an article returns to the same place in the
  feed. A link to a comment scrolls to it and highlights it. The author's name
  and avatar open the profile.
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
- Keep 1.0.0 as the baseline. Keep collecting under 1.0.1 until that version is
  released. A commit does not release a version.
- On release, add the date (`YYYY-MM-DD`) and open the next version. Leave
  released text as it was. Do not invent dates, tags, or test results.
- An edit that only changes this file does not need its own entry.

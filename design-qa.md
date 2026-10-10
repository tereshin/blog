# Profile and topic visual QA

final result: passed

Scope: unify the existing production profile/topic frame and feeds using the supplied visual references. Existing app tokens, data, navigation and API behavior are retained. This is a structural implementation, not a replacement of profile content with the people/photos in the reference.

## Evidence

Source visuals:
- `/Users/tereshin/Desktop/Screenshot 2026-10-10 at 15.34.39.png` — foreign profile, 1454 × 1776 px.
- `/Users/tereshin/Desktop/Screenshot 2026-10-10 at 15.34.55.png` — topic, 1510 × 1780 px.
- `/Users/tereshin/Desktop/Screenshot 2026-10-10 at 15.35.56.png` — own profile, 1464 × 1780 px.

Rendered implementation:
- `/tmp/blog-profile-topic-qa/profile-desktop.png`, `/tmp/blog-profile-topic-qa/topic-desktop.png` — 1280 × 900 CSS px / screenshot px, DPR 1.
- `/tmp/blog-profile-topic-qa/profile-mobile.png`, `/tmp/blog-profile-topic-qa/profile-comments-mobile.png`, `/tmp/blog-profile-topic-qa/topic-mobile.png` — 390 × 844 CSS px / screenshot px, DPR 1.

Compared the full profile reference and desktop rendering together; compared the topic reference and rendering together. Compare the central content region rather than app navigation. Reference screenshots are cropped, higher-density content views; rendering includes the existing application shell. Absolute height and wrapping differ because mock API profiles have short descriptions and no cover/avatar images. These are intentional data differences. Image loading uses the existing avatar fallback and object-cover behavior, with explicit cover dimensions.

## Review

- Typography: shared 24px profile/topic titles, readable 15px descriptions, identical tab sizes, long names/descriptions wrap.
- Layout: common cover ratio 3.2:1, 96px desktop / 80px mobile avatars overlapping the cover, common padding and right-aligned actions. Profile posts use standalone feed cards with no outer nested card. Navigation underline meets the bottom of the header. Comments use independent cards.
- Colors/tokens: existing surface, muted, foreground and accent tokens retained in dark/light themes. Requested primary subscription action uses the existing accessible primary color.
- Assets: API cover/avatar URLs retained; profile badges retain existing assets. User-specific photos in the reference are not substituted for the current user’s content.
- Copy: localized existing labels retained. No new placeholder feature labels. Promotion/statistics controls removed. Topic subscriber count and popularity sorting are not invented: the current topic API does not provide them.
- Interaction: posts/comments, keyboard tab selection, sort menu, API sort parameters, reactions, bookmarks, expansion, editing and settings tested. Main-content axe checks pass for profile and topic in wide dark/light and mobile dark configurations.

## Comparison history

1. Fixed P2 stretched tabs by sizing tabs to content, and adjusted avatar overlap. Recaptured desktop and mobile views.
2. Fixed invalid aria-controls by placing headers and real feed tab panels under one Tabs provider. Fixed nested interactive badge tooltip triggers. All 12 targeted profile/topic E2E checks passed after those changes.
3. Fixed profile counter updates and rollback by including profile article queries in the existing reaction/bookmark mutation cache updates. Tested server-returned counts and retention across tab switches.

No remaining P0/P1/P2 visual findings in the requested scope. Final web production build passed (icon check, TypeScript, Vite). Latest profile/profile-topic E2E run: 23 passed, 1 skipped. Web unit tests: 105 passed across 17 files. Targeted ESLint passed.

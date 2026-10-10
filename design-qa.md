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


## Popular comments — supplied reference, 2026-10-10

final result: passed

Scope: match the sidebar composition and styling while keeping two latest genuinely reacted comments from the live API.

Source visual truth: `/var/folders/zr/h4kxlfwj00sgt053kx4gz3wm0000gn/T/TemporaryItems/NSIRD_screencaptureui_YSBteS/Screenshot 2026-10-10 at 17.14.24.png`. Source is a cropped sidebar at approximately 2x density; the 600 × 738 px card is normalized to 300 × 369 CSS px for comparison. Existing product sidebar remains 320 CSS px wide.

Implementation screenshots: `/tmp/blog-popular-comments-design/before.png`, `after.png`, `after-full.png`, `light.png`. Browser viewport: 1280 × 800 CSS px. Final sidebar crop: 320 × 280 screenshot/CSS px. State: guest, main feed, loaded, dark/light. Short live excerpts, API authors/avatars and actual counts differ from the reference; consequently card height differs. Reference people, comments and reactions are not inserted into live data.

Combined comparison evidence: `/tmp/blog-popular-comments-design/comparison.png` places the normalized reference and actual browser crop together. Full-page context is in `after-full.png`; the combined image shows the entire target component, including readable header and reaction details, so another focused crop was unnecessary.

Comparison history:
1. P1: article attribution was below the author and prefixed by quotes; reaction types were separate numbered pills. Fixed attribution beside the name, article on its own line without quotes, and actual glyphs followed by the localized aggregate count.
2. P2: extra item inset, undersized body/glyphs, incorrect surface and spacing. Fixed aligned 16px card insets, 36px avatars, 13px/18px author and article, 15px/22px body, 20px item gap, #222 dark surface and #c4c6c8 text.
3. P2: the shared radius token overrode a rounded utility. Browser inspection caught 16px instead of 10px; scoped --radius-card:10px fixes it. Recaptured after the fix. Reduced heading and attribution to medium weight for closer reference typography.

Required fidelity surfaces:
- Typography: existing system sans retained, 15px heading/body and 13px metadata; single-line name/article truncation, body clamped to three lines. Exact original font was not supplied; residual font rasterization differences are P3.
- Layout: source header composition, full-width text beneath the identity row, flat reaction summary, matched padding and radius. Live single-line excerpts naturally shorten the card.
- Colors: dark reference surface and foreground matched locally; existing light tokens retained and inspected.
- Assets: existing API avatars and configured reaction appearances retained. Only actual nonzero reaction kinds render. Source-specific people and decorative glyph choices are intentional content differences.
- Copy: localized UI labels retained; aggregate singular/plural count uses real API totals.

Validation: TypeScript and targeted ESLint passed. In-app browser verified two rows, text below header at identical x/width, reactions below text, absence of pills, correct radius/background, light theme and successful link navigation to the exact comment. No browser console errors observed. Existing E2E regression updated for the aggregate summary.

No remaining actionable P0/P1/P2 findings in this scoped sidebar change.

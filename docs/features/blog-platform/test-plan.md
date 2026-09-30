---
status: Draft
owner: QA
reviewers: ["implementing engineer", "Tech Lead"]
updated_at: "2026-09-30"
feature_size: XL
---

# Test plan — blog-platform

Readers and writers get a public place to publish, follow, and respond. Staff hide abuse from a separate admin panel, after a second factor.

End-to-end paths through the UI follow `ux-flows.md`. Component states follow `screens.md`. Levels below are the ones confirmed for this feature.

## Levels

| Level | Scope | Strategy (generic — no tool names) |
|---|---|---|
| Unit | Pure logic: a rule, a calculation, a validator — no I/O. | In-memory, no external dependency. |
| Integration | The module against a real dependency it owns (store, cache, or queue). | An ephemeral real dependency, for example a throwaway database container spun up per suite. Cache and queue containers join when that module owns them. |
| Contract | A boundary between two participants — an API shape or event schema both sides agree on. | Validate the real shape against the agreed contract; no hand-rolled stubs. |
| E2E | N/A: each user story is driven through the UI (`e2e-through-UI`). Worker delivery is an integration test. | N/A |
| Load | NFR validation for the numeric targets in spec.md §6. | The load tool already in your repo, or e.g. k6 or Locust. |
| Component | A UI component exercised in isolation — props and state become rendered output and interactions. | Render in a component harness; assert output and behaviour, no full app boot. |
| Visual-regression | The rendered UI diffed against an approved baseline image. | Snapshot the render; fail on an unintended visual diff; update the baseline deliberately. |
| E2E-through-UI | A user-story flow driven through the real UI, not just the API. | The flow exercised through the rendered UI against ephemeral dependencies. |

## AC coverage

| AC (spec.md §5) | Test name (intent-based) | Level | Expected outcome |
|---|---|---|---|
| AC-01 | public article read matches the agreed shape | contract | The read includes the article text, its images, its comments, and the like, comment, and view counts. |
| AC-01 | guest opens a published article | e2e-through-UI | A guest sees the text, the images, the comments, and the three counts. |
| AC-01 | published article page matches the approved picture | visual-regression | The default article screen matches the approved picture. |
| AC-02 | same viewer inside the window adds no view | unit | A second view inside 30 minutes from the same guest session or the same user is not counted. A different guest session is counted. |
| AC-02 | stored view count ignores a repeat inside the window | integration | Keeping the article open or opening it again inside 30 minutes does not raise the stored view count for that viewer. |
| AC-03 | fresh order and popular score | unit | Fresh order is newest first. The popular score uses views, likes, comments, bookmarks, and age, and age lowers the score. The weights in force are the ones currently stored. |
| AC-03 | guest browses fresh and popular | e2e-through-UI | The guest sees both feeds, articles of every content language, and is not offered My feed. A full page lists 20 articles. |
| AC-04 | public theme and interface language | component | Light, dark, and system apply on the public site. English, Serbian Latin, and Russian apply. A missing string is shown in English. |
| AC-04 | theme and language remain on a later visit | e2e-through-UI | After the guest leaves and comes back, the same theme and interface language are still in use. |
| AC-04 | light and dark public article match the approved pictures | visual-regression | Light and dark pictures match the approved baselines. Body text is at least 4.5 to 1. Large text and controls are at least 3 to 1. |
| AC-05 | unique username is stored | integration | A username nobody else has is saved on that user. |
| AC-05 | guest sees the new username | e2e-through-UI | A guest opens the profile and sees that username. |
| AC-06 | taken username is not saved | integration | Saving a username another user already has does not change the profile. |
| AC-06 | profile setup says the username is taken | component | The profile setup screen stays open and tells the person the username is already taken. |
| AC-07 | draft is kept and publish stores the article | integration | Typing keeps the draft. Publish stores the text, the image, the one category, and the content language. |
| AC-07 | second preview matches and a guest sees the article | e2e-through-UI | The second preview shows the same edits. A guest sees that text, that image, that category, and that content language. |
| AC-08 | publish requires exactly one category | unit | No category, or more than one category, blocks publication. |
| AC-08 | editor says the article needs one category | component | The editor stays open and tells the user an article must belong to exactly one category. |
| AC-09 | publish requires a title | unit | A draft with one category and no title cannot be published. |
| AC-09 | editor says the title must be present | component | The editor stays open and tells the user the title must be present. |
| AC-10 | publish requires a username | unit | A signed-in person with no username cannot publish. |
| AC-10 | the person is told a username is required | component | They are told a username is required first, and profile setup shows that message. |
| AC-11 | previous version stays recorded | integration | The new text is what readers are served. The previous version remains stored. |
| AC-11 | readers see the new text and cannot browse older versions | e2e-through-UI | Readers see the new text. Neither readers nor the author can open an earlier version. |
| AC-12 | another user cannot change the article | integration | A different user does not change the article. |
| AC-13 | follow is stored and unfollow removes only that follow | integration | Following a user and a category records both. Stopping one drops only that one. |
| AC-13 | the remaining follow is still there | e2e-through-UI | After one follow is stopped, the other follow is still in effect. |
| AC-14 | my feed membership keeps each article once | unit | Followed authors and categories are included, unrelated articles are excluded, and a duplicate article appears once. A content-language limit keeps only those languages. |
| AC-14 | assembled my feed matches the follows | integration | The stored feed is newest first, contains only the followed sources, and honours the language limit when one is set. |
| AC-14 | the user sees that my feed | e2e-through-UI | The user sees every currently published article from the followed author and category, once each, newest first, and does not see the unrelated articles. |
| AC-15 | like toggles the stored count | integration | The first like records one like and raises the count by one. The second like removes it and lowers the count by one. |
| AC-15 | the open article shows the count go up and down | e2e-through-UI | The reader sees the count rise by one and then fall by one. |
| AC-16 | a guest write is not recorded | integration | A guest like, comment, follow, bookmark, publish, or direct message is not stored. |
| AC-16 | the guest is asked to sign in | component | The public screen asks the guest to sign in and does not show a successful write. |
| AC-16 | guest actions do not stick | e2e-through-UI | Those actions are not recorded, and the guest is asked to sign in. |
| AC-17 | reply, mention, and comment like are stored | integration | The reply stays under that comment. A reply deeper than the third level is stored. The mention is available to the mentioned user. The comment like is stored. |
| AC-17 | the thread shows the reply flat past the third level | e2e-through-UI | The reply is shown under the comment, a deeper reply is shown flat, and the mentioned user can see the mention. |
| AC-18 | comments are only allowed on a visible published article | unit | A draft, a hidden article, and a soft-removed article are not open for comments. A published article readers can still see is open. |
| AC-18 | those comments are not stored | integration | Trying to comment on a draft, a hidden article, or a soft-removed article stores nothing, and the user is told comments are only allowed on a published article readers can still see. |
| AC-19 | bookmark is stored and then removed | integration | The article is on that user's bookmark list, then gone from that list after removal. |
| AC-19 | the private list shows the article and then does not | e2e-through-UI | The user sees the article on their bookmark list and, after removal, no longer sees it there. |
| AC-20 | someone else cannot open the bookmark list | integration | A guest or a different user is not shown that list. |
| AC-21 | message, unread count, and read mark are stored | integration | The message is kept. The recipient's unread count includes it. After the recipient reads it, the sender's read mark is stored. |
| AC-21 | recipient sees the message and the sender sees the read mark | e2e-through-UI | The recipient later sees the message with an unread count. After they read it, the sender sees that it was read. |
| AC-22 | a message with no text is blocked | unit | An empty message is not accepted. |
| AC-22 | the conversation says the message must contain text | component | The conversation stays open and tells the user the message must contain text. |
| AC-23 | staff complaint list matches the agreed shape | contract | A filed complaint for an article or a comment is part of the staff list shape. |
| AC-23 | the complaint is stored | integration | The complaint, with its reason, is kept for that article or comment. |
| AC-23 | staff see the complaint in the admin panel | e2e-through-UI | A moderator or an administrator sees that complaint on the open-complaints screen. |
| AC-24 | a complaint with no reason is blocked | unit | A complaint without a reason is not accepted. |
| AC-24 | the complaint step says a reason must be present | component | The complaint step stays open and tells them a reason must be present. |
| AC-25 | live article and conversation payloads match the agreed shape | contract | The article payload can carry a like count, a comment count, a new or hidden comment, or a hide. It does not have to carry a view count. The conversation payload is only for the two participants. |
| AC-25 | open views receive the change once | integration | A like, a comment, a hide, or a direct message reaches the open view. A repeated delivery does not apply it twice. An outsider does not receive the direct message. The view count on that open view does not have to change. |
| AC-25 | the open article and conversation change without a reload | e2e-through-UI | The guest and the user see the article change without a reload. Only the two users in the conversation see the new message, without a reload. |
| AC-26 | notice event is in-product only | contract | The agreed notice shape is an in-product notice. It is not an email or a phone alert. |
| AC-26 | one notice is stored and no email or phone alert is sent | integration | A reply, a mention, a follow, or a direct message creates one notice. A repeated delivery does not create a second notice. No email or phone alert is sent. |
| AC-26 | the user sees the in-product notice | e2e-through-UI | The user sees that notice in the product and does not get an email or a phone alert from this release. |
| AC-27 | hide removes the public text and writes the trail | integration | Readers who are not the author no longer receive the text or the comments. The author still receives the text. Staff can read the full text in the admin panel. The trail records the reason. Each open complaint about that article or comment leaves the open list. |
| AC-27 | readers see unavailable and are not told staff hid it | e2e-through-UI | A guest or another user sees that the piece is unavailable, without the words that staff hid it. The author still sees the text and sees that readers cannot. |
| AC-27 | reader-unavailable article matches the approved picture | visual-regression | The unavailable picture does not say that staff hid the piece. |
| AC-28 | a non-staff user cannot hide content | integration | Hide is refused, and the article or comment stays as it was. |
| AC-28 | a non-staff person is not left inside the admin panel | e2e-through-UI | Opening the admin panel refuses them, and they are not left inside it. |
| AC-29 | hide or block with no reason is blocked | unit | Completing a hide or a block with no reason does not perform the action, and the caller is told a reason must be present. |
| AC-30 | staff tools stay closed without a second factor | integration | Hide, block, category change, role assignment, complaint dismissal, and staff soft-remove do not run. |
| AC-30 | the second-factor gate stays closed | component | The gate tells them the tools are closed, and no staff tool is shown as available. |
| AC-31 | block and lift change what the user can do | integration | While blocked, publish, comment, follow, like, bookmark, and direct message are refused. Read, own edit, own soft-remove, and a complaint still work. After the lift, the refused actions work again. |
| AC-31 | the blocked user is told the account is blocked | component | The user is told the account is blocked. The open article stays readable. |
| AC-31 | the user sees the block and the later lift | e2e-through-UI | The stopped actions fail while the block lasts, and they succeed again after the lift. |
| AC-32 | already published articles stay visible during a block | integration | Those articles stay readable. A new publish is refused while the block lasts. |
| AC-33 | category, moderator role, and weights are stored | integration | The category has English, Serbian Latin, and Russian names. That user holds the moderator role. The popular feed uses the new weights. |
| AC-33 | the catalog changes show up for writers and on the popular feed | e2e-through-UI | The category is available for a new article in all three names. That user can act as a moderator. The popular feed uses the new weights. |
| AC-34 | a moderator cannot run administrator catalog actions | integration | Create category, assign role, and change popular weights are refused. |
| AC-35 | role change or staff withdrawal with no reason is blocked | unit | The role does not change, the article is not soft-removed, and the caller is told a reason must be present. |
| AC-36 | the audit trail is complete and cannot be rewritten | integration | The trail has every hide, block, role change, staff soft-remove, complaint dismissal, and category change. A reason is present where that action recorded one. A category move is present even with no reason. A staff rewrite or erase does not change the trail. |
| AC-36 | an administrator sees the full trail | e2e-through-UI | The administrator sees those entries, including each recorded reason, and sees no control that rewrites or erases the trail. |
| AC-37 | a moderator sees only their own audit entries | integration | Entries from other staff are not included. |
| AC-38 | author withdrawal hides the article without marking it as a staff hide | integration | Readers who are not the author no longer receive the text or the comments. The author still receives the text and the fact that they withdrew it. The record remains. The article is not stored as hidden by a moderator. |
| AC-38 | a guest is not told the author withdrew it | e2e-through-UI | The guest sees unavailable, with no text and no comments, and is not told the author withdrew it. Staff see the full text only in the admin panel. |
| AC-38 | guest unavailable page does not name a withdrawal | visual-regression | The picture does not say the author withdrew the article. |
| AC-39 | staff soft-remove keeps the record and the reason | integration | Readers no longer receive the article. The record remains. The trail has the reason. |
| AC-40 | administrator hide or block is stored with the reason | integration | Readers no longer receive the hidden piece. A blocked user cannot publish, comment, follow, like, bookmark, or send a direct message. The trail has the reason. |
| AC-40 | administrator completes hide or block from the complaint | e2e-through-UI | Readers no longer see the hidden piece, the blocked user is stopped, and the administrator can see the trail entry with that reason. |
| AC-41 | another user or a moderator cannot withdraw the article | integration | The soft-remove is refused. The moderator can still hide it when a reason is given. |
| AC-42 | saved profile fields are stored and omitted fields stay absent | integration | Display name, biography, and avatar are stored only when saved. |
| AC-42 | a guest sees only the saved profile fields | e2e-through-UI | The guest sees each field that was saved, and a field that was not saved is absent. |
| AC-43 | an article with no image may be published | unit | A draft with a title, one category, a content language, and text, and with no image, is allowed to publish. |
| AC-43 | the published article has text and no image | integration | The stored article has the text and no image. |
| AC-44 | publish requires text | unit | A draft with a title and one category and with no text cannot be published. |
| AC-44 | editor says the text must be present | component | The editor stays open and tells the user the text must be present. |
| AC-45 | a draft is not readable by anyone except the author | integration | A guest or a different user does not receive the draft text. The author still can. |
| AC-45 | strangers see unavailable and are not told it is a draft | component | They see unavailable, they do not see the text, and they are not told it is a draft. The author can still open the editor. |
| AC-46 | content-language limit filters the three feeds | unit | One or more of English, Serbian Latin, and Russian keeps only those languages. A cleared limit keeps every content language. |
| AC-46 | fresh, popular, and my feed follow the limit | e2e-through-UI | All three feeds show only the chosen content languages, and a cleared limit shows every content language. |
| AC-47 | moving an article needs no reason | integration | Readers are served the article in the new category. The trail records the move. The move stands with no reason. |
| AC-48 | dismissal keeps the content and records the reason | integration | The article or comment stays visible. The complaint leaves the open list. The trail has the reason. |
| AC-48 | staff see the complaint leave the open list | e2e-through-UI | After dismissal, the open list no longer shows it, and readers still see the piece. |
| AC-49 | dismissal with no reason is blocked | unit | The dismissal does not run, the caller is told a reason must be present, and the complaint stays open. |
| AC-50 | a person holds exactly one role | integration | Setting moderator or administrator, or setting a moderator or another administrator back to user, leaves exactly one role. The role they held before is gone. |
| AC-50 | the administrator sees that single role | e2e-through-UI | After the change, that person is shown as only the new role. |
| AC-51 | the last administrator cannot step down | unit | The only administrator cannot become a user or a moderator, and they are told one administrator must remain. |
| AC-52 | the panel does not create the first administrator | integration | When no administrator exists, granting administrator from the panel creates no administrator. |
| AC-53 | platform statistics are assembled | integration | The result includes distinct users signed in today, distinct users signed in over the last 30 days, how many users are new, how many articles were published, how many comments were written, how many complaints are still open, and whether the public site is answering. |
| AC-53 | an administrator sees those figures | e2e-through-UI | The statistics screen shows each of those figures. |
| AC-54 | a moderator sees no platform statistics | integration | The panel returns no platform statistics for a moderator. |
| AC-55 | admin theme and interface language | component | Light, dark, and system apply on the admin panel. English, Serbian Latin, and Russian apply. A missing string is shown in English. |
| AC-55 | staff see the chosen theme and language | e2e-through-UI | The admin panel uses the theme and interface language that staff member chose. |
| AC-55 | light and dark admin panel match the approved pictures | visual-regression | Light and dark admin pictures match the approved baselines. Body text is at least 4.5 to 1. Large text and controls are at least 3 to 1. |

## Edge cases / error paths

Each error and authorization criterion above has its own rows. These are the further boundaries the spec implies.

- A guest or another user opens someone else's direct messages → expected: the messages stay hidden.
- Article text or a comment carries a block that would run for a reader, including an embed or raw markup → expected: the write is refused, nothing runnable is stored, and a reader never sees a running instruction.
- The same user repeats comments past 20 in a minute, likes past 60 in a minute, follows past 30 in a minute, direct messages past 60 in a minute, article edits past 60 in a minute, or image attachments past 20 in an hour → expected: that action is slowed.
- One anonymous visitor reads past 60 times in a minute → expected: further anonymous reads are slowed.
- An article identifier that does not exist → expected: the not-found screen, which is not the unavailable screen used for a draft, a hide, or a withdrawal.
- A view is taken before the article has stayed visible for 3 seconds → expected: that view is not counted.
- A moderator or an administrator is idle for 30 minutes → expected: they must sign in again before staff tools work.
- A feed has more than 20 published articles → expected: one page returns 20 articles.
- Body text and controls in light and dark → expected: body text is at least 4.5 to 1, and large text and controls are at least 3 to 1.
- The cache or the queue is down → expected: no test row. The spec does not name a fallback.

## Test data

- Seed strategy: factories from `data-model.md` — `buildUser`, `buildSignIn`, `buildBlock`, `buildCategory`, `buildArticle`, `buildArticleRevision`, `buildMediaObject`, `buildComment`, `buildComplaint`, `buildArticleLike`, `buildBookmark`, `buildCommentLike`, `buildFollow`, `buildConversation`, `buildNotification`, `buildOutboxEvent`. Usernames look like `user-<uuid>`. The display name is `Test User`. No fixture uses a real email, name, or phone.
- Integration dependency: an ephemeral real database, cache, and queue, started for the suite and destroyed after it. The datastore is not mocked. A test writes through the module that owns the schema.
- Cleanup boundary: per-test. Each test removes the rows and cache keys it wrote so the next test starts clean. Containers stay up for the suite.

## NFR validation (load)

The load tool already in your repo, or e.g. k6 or Locust. These runs are a check against the spec limits, not a search for peak capacity.

- Write p95 ≤ 300 ms → scenario: 10 writes per second for 2 minutes, assert write p95 ≤ 300 ms.
- Cached read p95 ≤ 100 ms → scenario: 50 cached reads per second for 2 minutes, assert read p95 ≤ 100 ms.
- Uncached read p95 ≤ 300 ms → scenario: 10 uncached reads per second for 2 minutes, assert read p95 ≤ 300 ms.
- Live update p95 ≤ 500 ms → scenario: 5 like, comment, or hide actions per second for 2 minutes, assert p95 from the action being recorded to the open article view changing ≤ 500 ms.
- Draft preview p95 ≤ 300 ms → scenario: 2 keystrokes per second for 1 minute, assert p95 from the keystroke being kept to the second preview ≤ 300 ms.
- Published article largest content paint ≤ 2.5 s → scenario: 5 article-page opens per second for 1 minute, assert largest content paint ≤ 2.5 s.
- Feed page size of 20 articles → scenario: 10 feed requests per second for 1 minute, assert each full page returns 20 articles.
- Published-article read availability of 99.9% → scenario: 20 cached reads per second for 5 minutes, assert at least 99.9% succeed. This sample is not the monthly figure. The monthly 99.9% stays a release watch.
- Same-viewer view window of 30 minutes → not a load run. The AC-02 integration test is the check.
- Admin session idle of 30 minutes → not a load run. An integration test with a controllable clock asserts that staff must sign in again after 30 idle minutes.
- Text contrast → not a load run. The AC-04 and AC-55 visual-regression rows assert the ratios in light and dark.

## CI placement

- On every pull request: unit, contract, and component.
- On a schedule or before release: integration, e2e-through-UI, visual-regression, and load.

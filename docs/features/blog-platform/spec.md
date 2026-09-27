---
status: Draft
owner: PM
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-09-27"
feature_size: XL
---

# Spec — blog-platform

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** `docs/TASK.md`, `docs/architecture-map.md`, `docs/DESIGN.md`. No reference-module code.

## 1. Context

Readers and writers need one public place to publish topical writing, follow authors and topics, and respond, while staff need a separate place to hide abuse. The people in play are a Guest, a User, a Moderator, and an Administrator, as named in the glossary.

There is no public product in production yet. The product brief's first-release list is the scope lock for design. Waiting would leave publishing, feeds, conversation, and moderation as competing guesses.

The committed approach is one public reading and writing surface plus a separate admin panel. A Guest reads. A User writes and participates. A Moderator and an Administrator act only from the admin panel, and signing in on the public surface does not open that panel. A Moderator or an Administrator must confirm a second factor before using staff tools. The admin panel offers the same three Interface languages and the same Theme choices as the public site. A Guest or a User who already has an Article open sees a new Like count, a new Comment count, a new or hidden Comment, or a hide of that Article or Comment without reloading. The View count follows the 30-minute rule and is outside that live update. An open Direct message conversation shows a new message without reloading, and only the Users in that conversation see it. A newly published Article shows up in the Fresh feed and in followers' My feed when those feeds are opened. My feed lists every currently published Article from the followed Users and Categories, newest first, each Article once. Interface language and Content language stay separate. A User may limit which Content languages appear in feeds; a cleared limit shows every Content language, and a Guest has no such limit. Theme is light, dark, or system, and system is the default.

Traceability: the first-release list and the later-release list in `docs/TASK.md`; platform boundaries in `docs/architecture-map.md` that this spec does not reopen; layout notes in `docs/DESIGN.md`, which are outside acceptance. The easy-depth assumptions ledger (items 1–11) was accepted in full: first release in, later release out, Moderator Block in, User-to-User mute out, four roles, Article states draft / published / hidden / soft-removed, three feeds, private Bookmarks, live counts, three Themes, three Interface languages, in-product Notifications only. Critic amendments accepted on 2026-09-27: Moderator and Administrator goals are separate; an Administrator may also hide, Block, and handle a Complaint; soft-remove has its own acceptance; live updates are limited to an open Article and an open Direct message conversation. Clarify resolutions accepted on 2026-09-27: a blocked User keeps edit, own soft-remove, and Complaint; live Article updates reach a Guest and a User; readers other than the author see a hidden or soft-removed Article as unavailable, and the author still sees the text and the state; a Complaint closes by hide or by dismissal, both with a reason; platform statistics are six figures for an Administrator only; a person holds one role and the last Administrator stays. The clarify easy-depth assumptions 1–14 were accepted in full.

## 2. Goals

- A Guest can find and read published Articles in the Fresh feed and the Popular feed, in the Interface language and Theme they choose.
- A User can publish an Article into a Category, gather Follows, and take part in Likes, Comments, Bookmarks, Direct messages, and Notifications, including while other people are looking at the same Article or conversation.
- A Moderator can hide harmful content and Block a User from the admin panel, with those actions written down.
- An Administrator can hide, Block, and handle a Complaint as well, soft-remove an Article, and keep Categories, roles, and the audit trail correct from the admin panel.

## 3. Non-goals

- Search, recommendations, hashtags, polls, Bookmark folders, scheduled publication, collaborative editing, company accounts, several authors on one Article, article analytics, and reading history are out, because the brief places them after the first release.
- Email and phone alerts are out, because the brief places them after the first release; in-product Notifications stay.
- One User muting or blocking another User is out, because the brief places that after the first release; a Moderator Block stays.
- Unlisted and archived Article states are out, because they are not in the first-release list.
- Serbian Cyrillic is out, because Serbian is Latin only in this release.
- Public-site column widths, sticky side regions, and the phone navigation bar are out of these acceptance criteria, because they belong to the screen stage (`docs/DESIGN.md`).
- Automatic translation of Articles is out, because Content language is the author's language and feeds do not rewrite it.
- An allowlist of embedded content is out of this release. Administrator settings here are the Popular feed weights and the rate limits already stated.

## 4. User stories

### US-01: Read a published article

**As a** Guest
**I want** to read a published Article with its Comments and counts
**So that** I can follow a piece without signing in

### US-02: Browse public feeds

**As a** Guest
**I want** to open the Fresh feed and the Popular feed
**So that** I can find new and active writing

### US-03: Choose theme and language

**As a** Guest
**I want** to switch Theme and Interface language
**So that** the public site matches how I see and which language I read

### US-04: Create a profile

**As a** User
**I want** a unique Username and a public profile
**So that** other people can find me and follow me

### US-05: Publish an article

**As a** User
**I want** to draft an Article, keep the draft as I type, see those edits in a second preview, attach an image, and publish it into one Category
**So that** readers and followers can see the finished piece

### US-06: Revise a published article

**As a** User
**I want** to change my published Article without losing the previous version
**So that** I can correct it and readers see the latest text

### US-07: Follow authors and categories

**As a** User
**I want** to follow a User and a Category, and to stop following
**So that** their new Articles come to me

### US-08: Read my feed

**As a** User
**I want** My feed
**So that** I see writing from the people and topics I follow

### US-09: Like an article

**As a** User
**I want** to Like an Article and take that Like back
**So that** the author and other readers see how many people endorse it

### US-10: Comment on an article

**As a** User
**I want** to Comment, reply, Like a Comment, and mention another User
**So that** the discussion stays on the Article

### US-11: Bookmark an article

**As a** User
**I want** to Bookmark a published Article and remove that Bookmark
**So that** I can return to it in private

### US-12: Send a direct message

**As a** User
**I want** to send a Direct message to one other User
**So that** we can talk even if they are away, and I can see when they have read it

### US-13: Report content

**As a** User
**I want** to file a Complaint about an Article or a Comment
**So that** a Moderator can review it

### US-14: Watch activity live

**As a** User
**I want** the Like count, the Comment count, new or hidden Comments, a hide, and incoming Direct messages to change while I am looking
**So that** I do not reload to see what just happened

### US-15: Receive a notice

**As a** User
**I want** an in-product Notification for a reply, a mention, a new follower, or a new Direct message
**So that** I hear about activity that involves me

### US-16: Hide harmful content

**As a** Moderator
**I want** to hide an Article or a Comment from a Complaint, and to change an Article's Category, giving a reason
**So that** readers stop seeing the harmful piece, including people who already have it open

### US-17: Block an account

**As a** Moderator
**I want** to Block a User, with a reason, and later lift that Block
**So that** they cannot keep publishing or messaging

### US-18: Run the catalog and roles

**As an** Administrator
**I want** to manage Categories and their three translations, assign roles, change Popular feed weights, see platform statistics, hide, Block, handle a Complaint, and soft-remove an Article
**So that** the public catalog and the staff stay correct

### US-19: Read the audit trail

**As an** Administrator
**I want** every hide, Block, role change, staff soft-remove, and Complaint dismissal recorded with a reason, every Category change recorded, and I want to read the whole trail
**So that** staff actions can be reviewed later

### US-20: Withdraw an article

**As a** User
**I want** to soft-remove an Article I own
**So that** readers no longer see it while the record remains

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** a published Article with Comments and counts
**When** a Guest opens it
**Then** the Guest sees the Article text, its images, its Comments, and the Like, Comment, and View counts

### AC-02 (US-01) — domain invariant

**Given** a Guest or a User has already added a View to an Article in the last 30 minutes
**When** that same viewer keeps the Article open or opens it again inside those 30 minutes
**Then** the system does not add another View. A Guest is the same viewer when the same browser session returns. A User is the same viewer when that User returns. A different browser session is a different Guest viewer

### AC-03 (US-02) — happy path

**Given** several published Articles of different ages and engagement
**When** a Guest opens the Fresh feed and the Popular feed
**Then** the Fresh feed lists published Articles newest first, the Popular feed lists them by the current score of Views, Likes, Comments, Bookmarks, and age, Articles of every Content language appear, and My feed is not offered

### AC-04 (US-03) — happy path

**Given** a Guest on the public site
**When** the Guest chooses a Theme among light, dark, and system, and an Interface language among English, Serbian Latin, and Russian
**Then** the public site uses that Theme and that Interface language, the choice remains on a later visit, and a missing translation falls back to English

### AC-05 (US-04) — happy path

**Given** a person who has just signed in and has no Username yet
**When** they choose a Username that nobody else has and save a public profile
**Then** the system records that User, and a Guest can open the profile and see the Username

### AC-06 (US-04) — error

**Given** a User is choosing a Username that another User already has
**When** they try to save it
**Then** the system blocks the save and tells them that the Username is already taken

### AC-07 (US-05) — happy path

**Given** a User who already has a Username, an open draft, a second preview of that draft, and one Category
**When** the User types, attaches an image, sets the Content language, and publishes
**Then** the draft is kept while they type, the second preview shows the same edits, and the published Article shows that text, that image, that Category, and that Content language to a Guest

### AC-08 (US-05) — domain invariant

**Given** a User's draft with a title and either no Category or more than one Category
**When** the User tries to publish
**Then** the system blocks publication and tells the User that an Article must belong to exactly one Category

### AC-09 (US-05) — error

**Given** a User's draft with exactly one Category and no title
**When** the User tries to publish
**Then** the system blocks publication and tells the User that the title must be present

### AC-10 (US-05) — domain invariant

**Given** a signed-in person who has not chosen a Username
**When** they try to publish an Article
**Then** the system blocks publication and tells them that a Username is required first

### AC-11 (US-06) — happy path

**Given** a User who owns a published Article
**When** the User changes the text and saves
**Then** readers see the new text, the previous version remains recorded, and neither readers nor the author browse earlier versions in this release

### AC-12 (US-06) — authorization

**Given** a published Article owned by one User
**When** a different User tries to change it
**Then** the system refuses the change

### AC-13 (US-07) — happy path

**Given** a User, another User, and a Category
**When** the first User follows that User and that Category, then stops following one of them
**Then** the system records the remaining Follow and drops the one they stopped

### AC-14 (US-08) — cross-context

**Given** a User who follows one author and one Category, and published Articles from that author, from that Category, and from neither
**When** the User opens My feed
**Then** the feed shows every currently published Article from the followed author and from the followed Category, newest first, each Article once, it does not show the unrelated Articles, and it shows only that User's chosen Content languages when a limit is set

### AC-15 (US-09) — happy path

**Given** a User viewing a published Article
**When** the User Likes it and then Likes it again
**Then** the first action records one Like and raises the count by one, and the second action removes that Like and lowers the count by one

### AC-16 (US-09) — authorization

**Given** a Guest viewing a published Article
**When** the Guest tries to Like, Comment, Follow, Bookmark, publish, or send a Direct message
**Then** the system does not record the action and asks the Guest to sign in

### AC-17 (US-10) — happy path

**Given** a published Article and two Users
**When** the first User Comments, the second User replies and mentions the first, and one of them Likes the Comment
**Then** the reply is kept under that Comment, a reply deeper than the third level is still kept and shown flat, and the mention is available to the mentioned User

### AC-18 (US-10) — cross-context

**Given** an Article that is still a draft, that a Moderator has hidden, or that has been soft-removed
**When** a User tries to Comment on it
**Then** the system blocks the Comment and tells the User that Comments are only allowed on a published Article that readers can still see

### AC-19 (US-11) — happy path

**Given** a User and a published Article
**When** the User Bookmarks it and later removes the Bookmark
**Then** the Article appears in that User's private Bookmark list and then disappears from that list

### AC-20 (US-11) — authorization

**Given** a User has Bookmarked an Article
**When** a Guest or a different User tries to open that Bookmark list
**Then** the system does not show it

### AC-21 (US-12) — happy path

**Given** two Users, and the recipient is not currently present
**When** the sender sends a Direct message
**Then** the message is kept, the recipient later sees it with an unread count, and after the recipient reads it the sender sees that it was read

### AC-22 (US-12) — error

**Given** a User in a conversation with one other User
**When** the User tries to send a message with no text
**Then** the system blocks the send and tells the User that the message must contain text

### AC-23 (US-13) — happy path

**Given** a User and a published Article or a Comment
**When** the User files a Complaint with a reason
**Then** a Moderator or an Administrator can see that Complaint in the admin panel

### AC-24 (US-13) — error

**Given** a User filing a Complaint
**When** they submit it with no reason
**Then** the system blocks the Complaint and tells them that a reason must be present

### AC-25 (US-14) — happy path

**Given** a Guest or a User is looking at a published Article, and a User is in a Direct message conversation
**When** someone Likes the Article, Comments on it, a Moderator or an Administrator hides that Article or that Comment, or a Direct message arrives
**Then** the Like count, the Comment count, and the new, hidden, or unavailable Article or Comment change on the open view without a reload for that Guest and that User, the Direct message changes without a reload only for the Users in that conversation, and the View count does not have to change on that open view

### AC-26 (US-15) — happy path

**Given** a User who can receive notices
**When** someone replies to their Comment, mentions them, follows them, or sends them a Direct message
**Then** the User gets an in-product Notification for that event and does not get an email or a phone alert from this release

### AC-27 (US-16) — happy path

**Given** a Moderator, a Complaint, and a published Article or Comment that readers currently have open
**When** the Moderator hides that Article or Comment and gives a reason
**Then** a Guest or a User who is not the author no longer sees the text or the Comments in feeds or on the page, and sees that the piece is unavailable without being told that staff hid it. The author still sees the text and sees that readers cannot. Staff see the full text only in the admin panel. The action is on the audit trail with that reason. Each open Complaint about that Article or Comment leaves the open list

### AC-28 (US-16) — authorization

**Given** a User who is not a Moderator or an Administrator
**When** they try to hide an Article or a Comment, or try to open the admin panel
**Then** the system refuses, and they are not left inside the admin panel

### AC-29 (US-16) — domain invariant

**Given** a Moderator hiding an Article or a Comment, or Blocking a User
**When** they try to complete the action with no reason
**Then** the system blocks the action and tells them that a reason must be present

### AC-30 (US-16) — authorization

**Given** a Moderator or an Administrator who has not confirmed a second factor
**When** they try to use staff tools
**Then** the system does not let them hide, Block, change a Category, assign a role, dismiss a Complaint, or soft-remove

### AC-31 (US-17) — happy path

**Given** a Moderator and a User who is not staff
**When** the Moderator Blocks that User with a reason, and later lifts the Block
**Then** while blocked the User is told the account is blocked and cannot publish, Comment, Follow, Like, Bookmark, or send a Direct message. The User can still read, edit their own Article, soft-remove their own Article, and file a Complaint. After the lift, publish, Comment, Follow, Like, Bookmark, and Direct messages are possible again

### AC-32 (US-17) — cross-context

**Given** a User who already has published Articles
**When** a Moderator Blocks that User
**Then** those already published Articles stay visible, and new publishing is refused while the Block lasts

### AC-33 (US-18) — happy path

**Given** an Administrator in the admin panel
**When** they create a Category with English, Serbian Latin, and Russian names, assign the Moderator role to a User, and change the Popular feed weights
**Then** the Category is available for new Articles in all three names, that User can act as a Moderator, and the Popular feed uses the new weights

### AC-34 (US-18) — authorization

**Given** a Moderator in the admin panel
**When** they try to create a Category, assign a role, or change Popular feed weights
**Then** the system refuses those actions

### AC-35 (US-18) — domain invariant

**Given** an Administrator changing a User's role or soft-removing an Article
**When** they try to complete the action with no reason
**Then** the system blocks the action and tells them that a reason must be present

### AC-36 (US-19) — happy path

**Given** hide, Block, role-change, and staff soft-remove actions from more than one staff member
**When** an Administrator opens the audit trail
**Then** the Administrator sees every hide, Block, role change, staff soft-remove, and Complaint dismissal, each with its reason, and every Category change, and the trail cannot be rewritten or erased by staff

### AC-37 (US-19) — authorization

**Given** a Moderator who has performed some staff actions and other staff who have performed others
**When** the Moderator opens the audit trail
**Then** the Moderator sees only their own actions

### AC-38 (US-20) — happy path

**Given** a User who owns a published Article
**When** the User soft-removes it
**Then** a Guest or a User who is not the author no longer sees it in the feeds or on its page, sees that it is unavailable, with no text and no Comments, and is not told that the author withdrew it. The author sees the text and sees that they withdrew it. The record remains. The Article is not treated as hidden by a Moderator. Staff see the full text only in the admin panel

### AC-39 (US-18) — happy path

**Given** an Administrator and a published Article
**When** the Administrator soft-removes it and gives a reason
**Then** readers no longer see it, the record remains, and the action is on the audit trail with that reason

### AC-40 (US-18) — happy path

**Given** an Administrator, a Complaint, and a published Article or Comment
**When** the Administrator hides that Article or Comment, or Blocks the author, and gives a reason
**Then** readers no longer see the hidden piece, a blocked User cannot publish, Comment, Follow, Like, Bookmark, or send a Direct message, and the action is on the audit trail with that reason

### AC-41 (US-20) — authorization

**Given** a published Article owned by one User
**When** a different User, or a Moderator, tries to soft-remove it
**Then** the system refuses, and the Moderator can still hide it with a reason

### AC-42 (US-04) — happy path

**Given** a User who already has a Username
**When** they save a Display name, a Biography, or an Avatar
**Then** a Guest who opens the profile sees each field that was saved, and a field that was not saved is absent

### AC-43 (US-05) — domain invariant

**Given** a User's draft with a title, exactly one Category, a Content language, and text, and with no image
**When** the User publishes
**Then** the system publishes the Article, and a Guest sees the text with no image

### AC-44 (US-05) — error

**Given** a User's draft with a title and exactly one Category and with no text
**When** the User tries to publish
**Then** the system blocks publication and tells the User that the text must be present

### AC-45 (US-05) — authorization

**Given** a User's draft
**When** a Guest or a different User tries to open it
**Then** they see that it is unavailable, they do not see the text, and they are not told that it is a draft. The author can still open the draft

### AC-46 (US-08) — cross-context

**Given** a User
**When** they set a Content language limit to one or more of English, Serbian Latin, and Russian, or they clear that limit
**Then** the Fresh feed, the Popular feed, and My feed show only the chosen Content languages, and a cleared limit shows every Content language

### AC-47 (US-16) — happy path

**Given** a Moderator and a published Article in one Category
**When** the Moderator moves it to one other Category and gives no reason
**Then** readers see the Article in the new Category, the action is on the audit trail, and the move stands without a reason

### AC-48 (US-18) — happy path

**Given** an open Complaint about a published Article or a Comment
**When** a Moderator or an Administrator dismisses it and gives a reason
**Then** the Article or Comment stays visible to readers, the Complaint leaves the open list, and the action is on the audit trail with that reason

### AC-49 (US-18) — error

**Given** an open Complaint
**When** a Moderator or an Administrator tries to dismiss it with no reason
**Then** the system blocks the dismissal, tells them that a reason must be present, and the Complaint stays open

### AC-50 (US-18) — happy path

**Given** an Administrator, at least one other Administrator, and a User
**When** the Administrator sets that User to Moderator or to Administrator, or sets a Moderator or another Administrator back to User
**Then** that person holds exactly one of User, Moderator, or Administrator, and the role they held before is gone

### AC-51 (US-18) — domain invariant

**Given** an Administrator who is the only Administrator
**When** they try to set themselves back to User or to Moderator
**Then** the system blocks the change and tells them that one Administrator must remain

### AC-52 (US-18) — domain invariant

**Given** no Administrator exists yet
**When** a person tries to grant themselves Administrator from the admin panel
**Then** the system does not create that first Administrator from the panel

### AC-53 (US-18) — happy path

**Given** an Administrator in the admin panel
**When** they open platform statistics
**Then** they see how many distinct Users signed in today, how many distinct Users signed in over the last 30 days, how many Users are new, how many Articles were published, how many Comments were written, how many Complaints are still open, and whether the public site is answering

### AC-54 (US-18) — authorization

**Given** a Moderator in the admin panel
**When** they try to open platform statistics
**Then** the panel shows them no platform statistics

### AC-55 (US-16) — happy path

**Given** a Moderator or an Administrator in the admin panel
**When** they choose a Theme among light, dark, and system, and an Interface language among English, Serbian Latin, and Russian
**Then** the admin panel uses that Theme and that Interface language, and a missing translation falls back to English

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Latency p95 of a write (publish, Comment, Like, Direct message) | ≤ 300 ms | server timing of those writes |
| Latency p95 of a cached feed or Article read | ≤ 100 ms | server timing of cached reads |
| Latency p95 of an uncached feed or Article read | ≤ 300 ms | server timing of reads that miss the cache |
| Latency p95 until an open Guest or User sees a new Like count, a Comment count change, a new or hidden Comment, or a hide | ≤ 500 ms | time from the action being recorded to the open Article view changing. This is the performance target. The release watch for the same path is the 1 second KPI in §7 |
| Latency p95 of draft preview | ≤ 300 ms | time from a keystroke being kept to the author's second preview showing it |
| Published Article page largest content paint | ≤ 2.5 s | field measurement of the published Article page |
| Feed page size | 20 Articles | count returned for one page of a feed |
| Availability of published-Article reads | 99.9% | monthly share of successful reads |
| Same-viewer View window | 30 minutes | a second View from the same viewer inside the window is not counted |
| Admin session idle | 30 minutes | a Moderator or Administrator must sign in again after 30 idle minutes |
| Text contrast, both Themes | ≥ 4.5:1 for body text and ≥ 3:1 for large text and controls | check against WCAG 2.2 AA in light and dark |

## 6.1 Security / privacy

- **Data classification:** public for published Articles, Comments, and public profiles; confidential for Direct messages, Bookmark lists, and account secrets; internal for the audit trail. Published writing is meant to be read; private conversation and private marks are not; the trail is for staff review.
- **Personal data touched:** Username, Display name, Biography, Avatar, Direct message text, Bookmark list, Complaint text, and the staff actor on each audit entry. Direct message text and Bookmark lists are confidential. The rest of the profile is public once the User saves it as public.
- **AuthZ/AuthN impact:** a Guest may read published material only. A User may write, Follow, Like, Comment, Bookmark, message, file a Complaint, change only their own Article, and soft-remove only their own Article. A Moderator may hide, Block, handle Complaints, and change an Article's Category, only from the admin panel, and only after a second factor. An Administrator may hide, Block, handle Complaints, soft-remove an Article, and manage Categories, roles, weights, and settings, only from the admin panel, and only after a second factor. Settings in this release are the Popular feed weights and the rate limits stated below. An Administrator may set another person to Moderator or to Administrator and may return a Moderator or another Administrator to User, and may not remove the last Administrator. The first Administrator already exists before the panel and is not created from it. Signing in on the public surface does not open the admin panel. A blocked User may read, may edit their own Article, may soft-remove their own Article, may file a Complaint, and may not publish, Comment, Follow, Like, Bookmark, or send a Direct message until the Block is lifted. A person holds one role at a time: User, Moderator, or Administrator.
- **Abuse cases:**
  - A Guest or another User asks for someone else's Bookmark list or Direct messages: the system hides them.
  - A User tries to change or soft-remove another User's Article: the system refuses.
  - A User opens the admin panel: the system refuses and does not leave them inside it.
  - Article text or a Comment tries to carry instructions that would run for a reader: the reader sees text, not a running instruction.
  - Repeat actions are slowed per User: Comments 20 per minute, Likes 60 per minute, Follows 30 per minute, Direct messages 60 per minute, Article edits 60 per minute, image attachments 20 per hour. Anonymous reads are slowed per visitor. An Administrator can change these limits.
- **Security review:** Required. This release adds staff powers, a second factor, confidential messages, and new personal data.

## 7. Metrics / KPIs

- **First-release journey** — baseline: 0 checkpoints passed, target: every checkpoint passes once on a production-like check before release (sign in, Username, Follow a Category, publish with an image, appear on the Fresh feed and on a follower's My feed, a View counted, a Like seen by an open reader, a Comment seen by an open reader, a Bookmark saved, a Follow of the author, a Direct message with a read mark, a Moderator hide from a Complaint seen by an open reader and written to the audit trail, the author soft-removes an Article and a Guest no longer sees it, Interface language switched to Serbian Latin and then Russian, Theme switched to dark without a light flash on the next load).
- **Live Like visibility** — baseline: 0 (nothing shipped), target: p95 under 1 second from a Like being recorded to an open reader seeing the new count, over the first 30 days after release. This 1 second figure is the release watch. The performance target for the same path is 500 ms in §6.
- **Hidden-content residue** — baseline: 0, target: 0 cases per week in which a Guest still sees an Article or Comment more than 1 second after a Moderator hid it, for the first 90 days after release. This 1 second figure is the release watch. The performance target for the same path is 500 ms in §6.
- **Interface-language completeness** — baseline: 0, target: 100% of interface strings present in English, Serbian Latin, and Russian at release.

## 8. Open questions

- [ ] How many seconds must an Article stay visible before one View is counted? Default now: 3 seconds. — owner: PM, due: before sdd:design
- [ ] What are the starting weights of the Popular feed score before an Administrator changes them? Default now: Views, Likes, Comments, and Bookmarks weigh equally, and age lowers the score. — owner: PM, due: before sdd:tasks
- [ ] How many reads per minute may one anonymous visitor make before reads are slowed? Default now: 60. — owner: Security Lead, due: before sdd:design

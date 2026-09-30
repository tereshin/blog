# Tracker — blog-platform

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Promote the users schema migration | migration | Backend Lead | S | — | done |
| T2 | Promote the categories schema migration | migration | Backend Lead | S | T1 | done |
| T3 | Promote the content schema migration | migration | Backend Lead | S | T2 | done |
| T4 | Promote the media schema migration | migration | Backend Lead | S | T3 | done |
| T5 | Promote the comments schema migration | migration | Backend Lead | S | T4 | done |
| T6 | Promote the engagement schema migration | migration | Backend Lead | S | T5 | done |
| T7 | Promote the social schema migration | migration | Backend Lead | S | T6 | done |
| T8 | Promote the messages schema migration | migration | Backend Lead | S | T7 | done |
| T9 | Promote the notifications schema migration | migration | Backend Lead | S | T8 | done |
| T10 | Promote the feed schema migration | migration | Backend Lead | S | T9 | todo |
| T11 | Promote the rate-limit seed migration | migration | Backend Lead | S | T10 | todo |
| T12 | Add Redis, RabbitMQ, MinIO, and typed config | wiring | Backend Lead | M | — | todo |
| T13 | Add Firebase verification, Redis, RabbitMQ, and the event envelope | wiring | Backend Lead | M | T12 | todo |
| T14 | Record a User profile and a unique Username | app | Backend Lead | M | T1, T13 | todo |
| T15 | Assign one role and keep the last Administrator | app | Backend Lead | M | T14 | todo |
| T16 | Block an account and append the staff audit trail | app | Backend Lead | M | T15 | todo |
| T17 | Serve Categories and their three translations | app | Backend Lead | M | T2, T13, T15 | todo |
| T18 | Save Article drafts with a version check and sanitized HTML | app | Backend Lead | M | T3, T14, T17 | todo |
| T19 | Publish an Article and let the author withdraw it | app | Backend Lead | M | T18, T16 | todo |
| T20 | Keep the previous Article version on a published save | app | Backend Lead | S | T18 | todo |
| T21 | Issue presigned image uploads | app | Backend Lead | M | T4, T13, T18 | todo |
| T22 | Comment, reply, and mention on a visible Article | app | Backend Lead | M | T5, T13, T19 | todo |
| T23 | Record a Complaint about an Article | app | Backend Lead | S | T19 | todo |
| T24 | Record a Complaint about a Comment | app | Backend Lead | S | T22 | todo |
| T25 | Like an Article, Bookmark it, and count one View | app | Backend Lead | M | T6, T13, T19 | todo |
| T26 | Follow and unfollow Users and Categories | app | Backend Lead | S | T7, T14, T17 | todo |
| T27 | Serve Fresh, Popular, and My feed | app | Backend Lead | M | T10, T13, T19, T25, T26, T14 | todo |
| T28 | Exchange Direct messages between two Users | app | Backend Lead | M | T8, T14, T16 | todo |
| T29 | Deliver in-product Notifications | app | Backend Lead | M | T9, T13, T22, T26, T28 | todo |
| T30 | Hide an Article, move its Category, and staff-remove it | app | Backend Lead | M | T16, T19, T23 | todo |
| T31 | Hide a Comment and close its Complaints | app | Backend Lead | M | T16, T22, T24 | todo |
| T32 | List open Complaints and dismiss one | ports | Backend Lead | M | T13, T16, T23, T24 | todo |
| T33 | Compose the public Article read and refuse a Guest write | ports | Backend Lead | M | T13, T14, T19, T22, T25, T36 | todo |
| T34 | Require the staff second factor on admin routes | ports | Backend Lead | M | T15, T16, T33 | todo |
| T35 | Report platform statistics to an Administrator | ports | Backend Lead | M | T14, T19, T22, T23, T24, T34 | todo |
| T36 | Count rate limits with a sliding window | app | Backend Lead | M | T11, T13, T16 | todo |
| T37 | Relay each schema outbox from its own worker | infra | Backend Lead | M | T13, T19, T22, T25, T26, T28, T30, T31 | todo |
| T38 | Flush view increments from Redis | infra | Backend Lead | S | T25, T13 | todo |
| T39 | Push live Article and Direct message updates | app | Backend Lead | M | T37, T28, T30, T31 | todo |
| T40 | Share HeroUI tokens, Theme, and Interface language | ui | Frontend Lead | M | — | todo |
| T41 | Render the Fresh feed, the Popular feed, and a Category | ui | Frontend Lead | M | T40, T27, T17, T26 | todo |
| T42 | Render a published Article with Comments and live counts | ui | Frontend Lead | M | T40, T33, T39, T22, T25 | todo |
| T43 | Sign in and edit a public profile | ui | Frontend Lead | M | T40, T14, T33, T26 | todo |
| T44 | Edit and publish a draft on one screen | ui | Frontend Lead | M | T40, T18, T19, T20, T21 | todo |
| T45 | Show My feed and private Bookmarks | ui | Frontend Lead | M | T40, T27, T25 | todo |
| T46 | Show conversations and a live thread | ui | Frontend Lead | M | T40, T28, T39 | todo |
| T47 | Show Notifications and file a Complaint | ui | Frontend Lead | M | T40, T29, T23, T24 | todo |
| T48 | Open the admin panel only after a second factor | ui | Frontend Lead | M | T40, T34 | todo |
| T49 | Review Complaints and the staff Article | ui | Frontend Lead | M | T48, T30, T31, T32 | todo |
| T50 | Block and unblock an account from the admin panel | ui | Frontend Lead | S | T48, T16 | todo |
| T51 | Manage Categories, roles, and Popular weights | ui | Frontend Lead | M | T48, T17, T15, T27 | todo |
| T52 | Show platform statistics and the audit trail | ui | Frontend Lead | M | T48, T35, T16 | todo |

**Total:** 52 tasks, ~43.5 person-days.

---
status: draft
feature_size: XL
tool: code
updated_at: "2026-09-30"
---

# Screens — blog-platform

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks` (each `ui` task cites SCR ids + states), `implement`
> (builds the screen to the declared states) and `review` (the built screen must match this).
> Downstream stages reference **only this manifest** — never the raw Figma / `.pen` file.

## Source

- **Tool:** code. `docs/design-system.md` is absent, so this run did not draw Figma or a `.pen` file. Wireframes are inline below. Run `/sdd:design-system` to record the canon; until then, component names come from `docs/architecture-map.md` §Frontend shared primitives: Modal, Dropdown, DropdownMenu, Button, Input, Textarea, Avatar, Tooltip, Tabs, Popover, Skeleton, Card, Drawer, Pagination, Toast.
- **File:** inline wireframes below.
- **Degradation:** code mode, named here, because the design-system canon and its tool are absent.
- **Chrome:** a public screen uses `PublicShell`. An admin screen uses `AdminShell`. Theme and Interface language are in place on the current surface (AC-04, AC-55), so those two rows repeat. A missing Interface string is English. System is the Theme before any choice. The choice stays in this browser.
- **Lists:** the next page is a `Button`. Feeds and admin lists are cursor pages. `Pagination` is not used. Offset pagination is not used.
- **Errors:** the client translates `code`. The API body has no sentence. A toast is that translation. `params` are shown when the body includes them.
- **Not a screen:** `GET` and `PATCH /api/v1/admin/rate-limits` have no acceptance criterion and no sequence. `ux-flows.md` has no SCR for them. This manifest does not add one.
- **Confirmations:** SCR-01 through SCR-06 were accepted one screen at a time. SCR-07 through SCR-24 were locked on the recommended state set for each screen.

## Screens

### SCR-01 — Fresh feed

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-03, flow US-02, SAD “Browse public feeds”. Published Articles, newest first, every Content language. A Guest is not offered My feed and has no Content-language control. Theme is system until chosen. | PublicShell, Button, Dropdown, Card | wireframe below |
| loading | `GET /api/v1/feeds/fresh` before 200. SAD cache hit and cache miss are this same screen. | PublicShell, Skeleton | same as default, rows replaced by Skeleton |
| empty | Feed page `items` may be empty. | PublicShell, EmptyState | wireframe below |
| error | 429 `RATE_LIMITED`, `params.action` = `anonymous_read`. | PublicShell, Toast | same as default, plus Toast |
| content-language-limited | AC-46, SAD limit branch. Signed-in User only. | PublicShell, Button, Dropdown, Card | same as default |
| theme-applied | AC-04. Light, dark, or system, and English, Serbian Latin, or Russian, kept in this browser. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch. The chosen Interface language has no string. | PublicShell | same as default |
| N/A: success | The 200 response is `default`. | — | — |
| N/A: validation | The control only offers the three Content languages or clear. This screen does not send the body that returns 422 `CONTENT_LANGUAGE_INVALID`. | — | — |
| N/A: cleared limit as its own layout | AC-46 cleared is `default` (every Content language). | — | — |
| N/A: My feed hidden as its own state | AC-03. For a Guest that is the `default` chrome. | — | — |

```text
SCR-01 default
+--------------------------------------------------+
| PublicShell: Fresh | Popular | (My feed if user) |
| Theme, Interface language                        |
| Content languages (signed-in only)               |
+--------------------------------------------------+
| Card: Article title, author, time                |
| Card: Article title, author, time                |
| Button: next page                                |
+--------------------------------------------------+

SCR-01 empty
+--------------------------------------------------+
| PublicShell                                      |
| EmptyState: no published Articles                |
+--------------------------------------------------+
```

### SCR-02 — Popular feed

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-03, flow US-02, SAD “Browse public feeds”. Published Articles by the current score of Views, Likes, Comments, Bookmarks, and age. Every Content language. A Guest is not offered My feed. | PublicShell, Button, Dropdown, Card | wireframe below |
| loading | `GET /api/v1/feeds/popular` before 200. Cache hit and cache miss are this same screen. | PublicShell, Skeleton | same as default, rows replaced by Skeleton |
| empty | The Popular 200 example is `items: []`. | PublicShell, EmptyState | same shell as SCR-01 empty |
| error | 429 `RATE_LIMITED`, `params.action` = `anonymous_read`. | PublicShell, Toast | same as default, plus Toast |
| content-language-limited | AC-46, flow US-08 names SCR-02. Signed-in User only. | PublicShell, Button, Dropdown, Card | same as default |
| theme-applied | AC-04. In place on this public surface. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | PublicShell | same as default |
| N/A: success | The 200 response is `default`. | — | — |
| N/A: validation | The control only offers the three Content languages or clear. | — | — |
| N/A: cleared limit as its own layout | AC-46 cleared is `default`. | — | — |
| N/A: new Popular weights as their own layout | AC-33. After SCR-22 saves, this screen is still `default`. Only the order changes. | — | — |

```text
SCR-02 default
+--------------------------------------------------+
| PublicShell: Fresh | Popular                     |
| Theme, Interface language, Content languages     |
+--------------------------------------------------+
| Card: Article title, score order                 |
| Button: next page                                |
+--------------------------------------------------+
```

### SCR-03 — Article

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-01, AC-43, flow US-01. `GET` 200 `view: published`. Title, text, images when any exist, Comments, and the three counts. An empty image list is this state. The owner sees edit. Anyone else does not. | PublicShell, ArticleBody, CommentThread, Button, Textarea, Dropdown | wireframe below |
| loading | The article read before 200. | PublicShell, Skeleton | same shell, Skeleton in the column |
| unavailable | AC-27, AC-38, AC-45. 200 `view: unavailable`. | PublicShell, EmptyState | wireframe below |
| author | Platform decision, AC-27, AC-38. 200 `view: author`. Text stays. The state line follows `status` and `removed_by`. `author` reads as withdrawn by them. `staff` reads as readers cannot see it. | PublicShell, ArticleBody, Button | wireframe below |
| not-found | 404 `ARTICLE_NOT_FOUND`. A draft has no slug. This code does not say draft. | PublicShell, EmptyState | same as unavailable, copy is not-found |
| liked | AC-15. `POST …/like` 200 `liked: true`. Count up by one. | PublicShell, ArticleBody, Button | same as default |
| like-removed | AC-15. 200 `liked: false`. Count down by one. | PublicShell, ArticleBody, Button | same as default |
| comment-blocked | AC-18. 409 `COMMENT_ARTICLE_NOT_VISIBLE`. Stays here. | PublicShell, ArticleBody, Toast | same as default, plus Toast |
| comment-invalid | 422 `COMMENT_BODY_REQUIRED` on a Comment or a reply. | PublicShell, Textarea, Toast | same as default, plus Toast |
| flat-reply | AC-17. A reply with `depth` greater than 3. | PublicShell, CommentThread | same as default |
| live | AC-25. Like count, Comment count, a new or hidden Comment, or a hide, with no reload. | PublicShell, ArticleBody, CommentThread | same as default |
| edit-refused | AC-12. A different User does not open the editor. 403 `ARTICLE_NOT_OWNED` if the write is forced. | PublicShell, Toast | same as default, plus Toast |
| account-blocked | AC-31. 403 `ACCOUNT_BLOCKED` on Like, Comment, or Bookmark. The Article stays readable. | PublicShell, Toast | same as default, plus Toast |
| error | 429 `RATE_LIMITED`. | PublicShell, Toast | same as default, plus Toast |
| theme-applied | AC-04. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | PublicShell | same as default |
| N/A: empty | A published Article has text. An empty Comment list is inside `default`. | — | — |
| N/A: success | 200 and 201 are `liked`, `like-removed`, or the thread on `default`. | — | — |
| N/A: guest sign-in | AC-16. 401 leaves for SCR-04. Nothing is recorded. | — | — |
| N/A: view recorded as its own layout | AC-02. `recorded` true or false does not change the screen. AC-25: the View count on this open view does not have to change. | — | — |
| N/A: earlier versions | AC-11. They stay recorded and are not browsable. | — | — |
| N/A: staff full text | AC-27. That read is SCR-18. | — | — |

```text
SCR-03 default
+--------------------------------------------------+
| PublicShell                                      |
| ArticleBody: title, text, images                 |
| Button: Like, Bookmark, Report, Edit (owner)     |
| CommentThread: replies nest through depth 3      |
| Textarea + Button: Comment                       |
+--------------------------------------------------+

SCR-03 unavailable / not-found
+--------------------------------------------------+
| PublicShell                                      |
| EmptyState: unavailable, or not found            |
| unavailable does not say draft, hidden, withdrawn|
+--------------------------------------------------+

SCR-03 author
+--------------------------------------------------+
| PublicShell                                      |
| State line: draft, hidden, or soft-removed       |
| ArticleBody: text the author still sees          |
| Button: Edit                                     |
+--------------------------------------------------+
```

### SCR-04 — Sign-in

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-16, SAD “a guest tries to write”. Asks the Guest to sign in. The write was not recorded. | PublicShell, Button | wireframe below |
| loading | Firebase, then `GET /api/v1/me`. | PublicShell, Skeleton | same as default |
| error | `GET /api/v1/me` 401 `AUTH_REQUIRED` when the gateway does not accept the identity. | PublicShell, Toast | same as default, plus Toast |
| theme-applied | AC-04. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | PublicShell | same as default |
| N/A: empty | This screen is not a list. | — | — |
| N/A: validation | The spec does not define sign-in fields. Firebase proves the identity. | — | — |
| N/A: success | A stored Username returns to the attempted action. No Username leaves for SCR-06. | — | — |
| N/A: account-blocked | AC-31 does not stop sign-in. The write they return to enforces the Block. | — | — |
| N/A: rate limit | Sign-in is not a gateway route. `GET /api/v1/me` has no 429. | — | — |

```text
SCR-04 default
+--------------------------------------------------+
| PublicShell                                      |
| Button: sign in (hands the proof to Firebase)    |
+--------------------------------------------------+
```

### SCR-05 — Public profile

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-05, AC-42. `GET /api/v1/users/{username}` 200. Username, plus each saved Display name, Biography, or Avatar. An unsaved field is omitted. The owner gets a control to SCR-06. | PublicShell, Button, Avatar, Dropdown | wireframe below |
| loading | That GET before 200. | PublicShell, Skeleton | same as default |
| not-found | 404 `USER_NOT_FOUND`. | PublicShell, EmptyState | wireframe below |
| following | AC-13. `PUT …/follow` 200 `{ following: true }`. Stays here. A repeat stays one Follow. | PublicShell, Button | same as default |
| not-following | AC-13. `DELETE …/follow` 200 `{ following: false }`. A Category Follow is not changed here. | PublicShell, Button | same as default |
| account-blocked | AC-31. 403 `ACCOUNT_BLOCKED` on follow or unfollow. The profile stays readable. | PublicShell, Toast | same as default, plus Toast |
| error | 429 `RATE_LIMITED`. | PublicShell, Toast | same as default, plus Toast |
| theme-applied | AC-04. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | PublicShell | same as default |
| N/A: empty | A 200 profile always has a Username. A missing User is `not-found`. | — | — |
| N/A: saved field vs absent field as two layouts | AC-42 is `default`. An unsaved field is omitted. | — | — |
| N/A: validation | No save form. A taken Username is SCR-06. | — | — |
| N/A: success | The follow 200 is `following` or `not-following`. | — | — |
| N/A: guest sign-in | AC-16. 401 on Follow leaves for SCR-04. | — | — |

```text
SCR-05 default
+--------------------------------------------------+
| PublicShell                                      |
| Avatar only when avatar_url was saved            |
| Username, saved Display name, saved Biography    |
| Button: Follow, or Edit when this is the owner   |
+--------------------------------------------------+

SCR-05 not-found
+--------------------------------------------------+
| PublicShell                                      |
| EmptyState: no User has this Username            |
+--------------------------------------------------+
```

### SCR-06 — Profile setup

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-05, AC-42. First visit, or the owner’s later edit. Username, optional Display name, Biography, and Avatar URL. Later visits show `GET /api/v1/me`. Avatar is text, not the Article upload. | PublicShell, Input, Textarea, Button, Avatar, Dropdown | wireframe below |
| loading | `PUT /api/v1/me` or the opening `GET /api/v1/me`. | PublicShell, Skeleton | same as default |
| username-taken | AC-06. 409 `USERNAME_TAKEN`. Stays. Exact match, including case. | PublicShell, Input, Toast | same as default, plus Toast |
| username-required | AC-10, and 422 `USERNAME_REQUIRED`. Shown on arrival from a blocked publish, and when the save has no Username. | PublicShell, Input, Toast | same as default, plus Toast |
| theme-applied | AC-04. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | PublicShell | same as default |
| N/A: empty | An empty Username on the first visit is `default`. | — | — |
| N/A: success | 200 leaves for SCR-05. An omitted optional field is not cleared. | — | — |
| N/A: signed-out | 401 `AUTH_REQUIRED` leaves for SCR-04. | — | — |
| N/A: rate limit | `PUT /api/v1/me` has no 429. | — | — |
| N/A: account-blocked | AC-31 does not forbid this save. | — | — |

```text
SCR-06 default
+--------------------------------------------------+
| PublicShell                                      |
| Input: Username                                  |
| Input: Display name, Avatar URL                  |
| Textarea: Biography                              |
| Button: save                                     |
+--------------------------------------------------+
```

### SCR-07 — Category

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-13, flow US-07. `GET /api/v1/categories/{slug}` 200. The name for the current Interface language. A missing translation is already English from the category service. A control returns to the Article. | PublicShell, Button, Dropdown | wireframe below |
| loading | That GET before 200. | PublicShell, Skeleton | same as default |
| not-found | 404 `CATEGORY_NOT_FOUND`. | PublicShell, EmptyState | wireframe below |
| following | AC-13. `PUT …/categories/{id}/follow` 200 `{ following: true }`. A repeat stays one Follow. This write does not create a notice. | PublicShell, Button | same as default |
| not-following | AC-13. `DELETE` 200 `{ following: false }`. A User Follow is not changed here. | PublicShell, Button | same as default |
| account-blocked | AC-31. 403 `ACCOUNT_BLOCKED`. The Category stays readable. | PublicShell, Toast | same as default, plus Toast |
| error | 429 `RATE_LIMITED`. | PublicShell, Toast | same as default, plus Toast |
| theme-applied | AC-04. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch. This is the Interface string. The Category name is already handled by the service. | PublicShell | same as default |
| N/A: empty | A 200 Category has an id, a slug, and translations. | — | — |
| N/A: validation | This screen has no form. | — | — |
| N/A: success | The follow 200 is `following` or `not-following`. | — | — |
| N/A: guest sign-in | AC-16. 401 on Follow leaves for SCR-04. | — | — |
| N/A: article list | No acceptance criterion puts Articles on this screen. | — | — |

```text
SCR-07 default
+--------------------------------------------------+
| PublicShell                                      |
| Category name                                    |
| Button: Follow                                   |
| Button: back to the Article                      |
+--------------------------------------------------+

SCR-07 not-found
+--------------------------------------------------+
| PublicShell                                      |
| EmptyState: no Category has this slug            |
+--------------------------------------------------+
```

### SCR-08 — Editor

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-07, AC-43, ADR 0005. One screen for a new draft and a revision. The draft is kept while typing. The second preview shows the same edits. Exactly one Category. Content language is set here. An image is optional. | PublicShell, ArticleEditor, ArticleBody, Input, Dropdown, Button, ImageFileInput | wireframe below |
| loading | `GET /api/v1/me/articles/{article_id}` or a save before 200. | PublicShell, Skeleton | same as default |
| category-required | AC-08. 422 `ARTICLE_CATEGORY_REQUIRED`. The control sends one `category_id`, so a second Category is not a body this screen can submit. | PublicShell, Dropdown, Toast | same as default, plus Toast |
| title-required | AC-09. 422 `ARTICLE_TITLE_REQUIRED`. | PublicShell, Input, Toast | same as default, plus Toast |
| text-required | AC-44. 422 `ARTICLE_TEXT_REQUIRED`. | PublicShell, ArticleEditor, Toast | same as default, plus Toast |
| language-required | Publish 422 `ARTICLE_LANGUAGE_REQUIRED`. | PublicShell, Dropdown, Toast | same as default, plus Toast |
| block-rejected | ADR 0007. 422 `ARTICLE_BLOCK_REJECTED` on create or update. Embed and raw HTML are not kept. | PublicShell, ArticleEditor, Toast | same as default, plus Toast |
| version-conflict | ADR 0010. 409 `ARTICLE_VERSION_CONFLICT` on update. The stored row is unchanged. | PublicShell, Toast | same as default, plus Toast |
| account-blocked | AC-31, AC-32. 403 `ACCOUNT_BLOCKED` on publish. Edit, image attach, own soft-remove, and a Complaint stay possible. Already published Articles stay visible. | PublicShell, Toast | same as default, plus Toast |
| image-missing | `POST …/images` 404 `MEDIA_NOT_FOUND`. | PublicShell, Toast | same as default, plus Toast |
| error | 429 `RATE_LIMITED` on create, update, publish, image attach, or `POST /api/v1/media/uploads`. | PublicShell, Toast | same as default, plus Toast |
| not-found | `GET` the owner’s Article 404 `ARTICLE_NOT_FOUND`. | PublicShell, EmptyState | wireframe below |
| theme-applied | AC-04. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | PublicShell | same as default |
| N/A: empty | A blank draft is `default`. | — | — |
| N/A: success | Publish 200 and a revision save that finishes leave for SCR-03. An autosave 200 stays on `default` and the preview matches. | — | — |
| N/A: preview as its own screen | ADR 0005. The second preview is the `ArticleBody` on this screen. | — | — |
| N/A: no image as its own layout | AC-43. Publish with no image is `default`. | — | — |
| N/A: username required stays here | AC-10. 422 `USERNAME_REQUIRED` leaves for SCR-06. | — | — |
| N/A: guest or other owner | 401 leaves for SCR-04. 403 `ARTICLE_NOT_OWNED` is SCR-03 `edit-refused` and does not open this screen. | — | — |
| N/A: earlier versions | AC-11. The update response is the current Article only. | — | — |
| N/A: withdrawn stays here | Owner soft-remove 200 leaves for SCR-03 `author`. A blocked User may still withdraw. | — | — |

```text
SCR-08 default
+--------------------------------------------------+
| PublicShell                                      |
| Input: title                                     |
| Dropdown: one Category, one Content language     |
| ArticleEditor                                    |
| ArticleBody: second preview of the same draft    |
| ImageFileInput, Button: publish, withdraw (owner)|
+--------------------------------------------------+

SCR-08 not-found
+--------------------------------------------------+
| PublicShell                                      |
| EmptyState: this Article is not the owner's      |
+--------------------------------------------------+
```

### SCR-09 — My feed

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-14. `GET /api/v1/feeds/mine` 200. Published Articles from followed Users and Categories, newest first, each Article once. Unrelated Articles are absent. | PublicShell, Button, Dropdown, Card | wireframe below |
| loading | That GET before 200. SAD cache hit and cache miss are this same screen. | PublicShell, Skeleton | same as default |
| empty | The 200 example allows `items: []`. No followed Article, or the language limit excludes them. | PublicShell, EmptyState | wireframe below |
| content-language-limited | AC-46. The same list, only the chosen Content languages. | PublicShell, Dropdown, Card | same as default |
| error | 429 `RATE_LIMITED`. | PublicShell, Toast | same as default, plus Toast |
| theme-applied | AC-04. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | PublicShell | same as default |
| N/A: success | The 200 response is `default` or `empty`. | — | — |
| N/A: validation | The language control only offers the three languages or clear. | — | — |
| N/A: cleared limit as its own layout | AC-46 cleared is `default`. | — | — |
| N/A: guest | AC-03. My feed is not offered. 401 `AUTH_REQUIRED` leaves for SCR-04. | — | — |

```text
SCR-09 default
+--------------------------------------------------+
| PublicShell: Fresh | Popular | My feed           |
| Content languages                                |
| Card: followed Article, newest first             |
| Button: next page                                |
+--------------------------------------------------+

SCR-09 empty
+--------------------------------------------------+
| PublicShell                                      |
| EmptyState: no Articles from followed sources    |
+--------------------------------------------------+
```

### SCR-10 — Bookmarks

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-19. `GET /api/v1/me/bookmarks` 200. This User’s private list, newest first. Removing a Bookmark drops that row. | PublicShell, Card, Button | wireframe below |
| loading | That GET before 200. | PublicShell, Skeleton | same as default |
| empty | A 200 page may have no items. AC-19 after the Bookmark is removed and none remain. | PublicShell, EmptyState | wireframe below |
| theme-applied | AC-04. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | PublicShell | same as default |
| N/A: error | This GET has no 429. A failed remove is 403 `ACCOUNT_BLOCKED` on the Article (SCR-03), not a second list. | — | — |
| N/A: validation | This screen has no form. | — | — |
| N/A: success | 200 with items is `default`. | — | — |
| N/A: someone else’s list | AC-20. The only path is the caller’s list. A Guest gets 401 and leaves for SCR-04. A different User cannot address this list. | — | — |

```text
SCR-10 default
+--------------------------------------------------+
| PublicShell                                      |
| Card: bookmarked Article                         |
| Button: next page                                |
+--------------------------------------------------+

SCR-10 empty
+--------------------------------------------------+
| PublicShell                                      |
| EmptyState: no Bookmarks                         |
+--------------------------------------------------+
```

### SCR-11 — Conversation list

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-21. `GET /api/v1/conversations` 200. Each row is one conversation, the other User, and the unread count. | PublicShell, Card, Button | wireframe below |
| loading | That GET before 200. | PublicShell, Skeleton | same as default |
| empty | A 200 page may have no conversations. | PublicShell, EmptyState | wireframe below |
| theme-applied | AC-04. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | PublicShell | same as default |
| N/A: error | This GET has no 429 and no 404. | — | — |
| N/A: validation | This list has no send form. An empty message is SCR-12. | — | — |
| N/A: success | The 200 response is `default` or `empty`. | — | — |
| N/A: outsider | Someone outside a conversation does not receive that row. | — | — |
| N/A: guest | 401 leaves for SCR-04. | — | — |

```text
SCR-11 default
+--------------------------------------------------+
| PublicShell                                      |
| Card: other User, unread count                   |
| Button: next page                                |
+--------------------------------------------------+

SCR-11 empty
+--------------------------------------------------+
| PublicShell                                      |
| EmptyState: no conversations                     |
+--------------------------------------------------+
```

### SCR-12 — Conversation

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-21. `GET …/messages` 200. Text between these two Users. `read_at` is the sender’s read mark after the recipient reads. | PublicShell, Card, Textarea, Button | wireframe below |
| loading | That GET before 200. | PublicShell, Skeleton | same as default |
| empty-thread | A 200 page may have no messages yet. | PublicShell, EmptyState, Textarea, Button | wireframe below |
| message-invalid | AC-22. 422 `MESSAGE_BODY_REQUIRED`. Stays. Nothing is stored. | PublicShell, Textarea, Toast | same as default, plus Toast |
| live | AC-25. A new message arrives with no reload. Only these two Users see it. | PublicShell, Card | same as default |
| account-blocked | AC-31. 403 `ACCOUNT_BLOCKED` on send. | PublicShell, Toast | same as default, plus Toast |
| not-found | 404 `CONVERSATION_NOT_FOUND`. A caller who is not one of the two Users gets the same code as a missing conversation. | PublicShell, EmptyState | wireframe below |
| recipient-missing | `POST /api/v1/conversations` 404 `USER_NOT_FOUND` when starting a conversation. | PublicShell, Toast | same as default, plus Toast |
| error | 429 `RATE_LIMITED` on send. | PublicShell, Toast | same as default, plus Toast |
| theme-applied | AC-04. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | PublicShell | same as default |
| N/A: success | 201 appends the message on `default`. The recipient’s unread count is SCR-11. | — | — |
| N/A: guest | 401 leaves for SCR-04. The message is not stored. | — | — |
| N/A: view count | AC-25. A View increment is not this screen. | — | — |

```text
SCR-12 default
+--------------------------------------------------+
| PublicShell                                      |
| Card: message text, read mark for the sender     |
| Textarea + Button: send                          |
| Button: back to the list                         |
+--------------------------------------------------+

SCR-12 empty-thread
+--------------------------------------------------+
| PublicShell                                      |
| EmptyState: no messages yet                      |
| Textarea + Button: send                          |
+--------------------------------------------------+

SCR-12 not-found
+--------------------------------------------------+
| PublicShell                                      |
| EmptyState: this conversation is not available   |
+--------------------------------------------------+
```

### SCR-13 — Notifications

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-26. `GET /api/v1/notifications` 200. The client translates `type`. A reply or a mention opens SCR-03. A new follower opens SCR-05. A new Direct message opens SCR-12. | PublicShell, Card, Button | wireframe below |
| loading | That GET before 200. | PublicShell, Skeleton | same as default |
| empty | A 200 page may have no notices. | PublicShell, EmptyState | wireframe below |
| theme-applied | AC-04. | PublicShell, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | PublicShell | same as default |
| N/A: error | This GET has no 429. | — | — |
| N/A: validation | This screen has no form. | — | — |
| N/A: success | The 200 response is `default` or `empty`. | — | — |
| N/A: email or phone | AC-26. This release does not offer either. The quiet list is `default`. | — | — |
| N/A: guest | 401 leaves for SCR-04. | — | — |

```text
SCR-13 default
+--------------------------------------------------+
| PublicShell                                      |
| Card: translated notice type                     |
| Button: next page                                |
+--------------------------------------------------+

SCR-13 empty
+--------------------------------------------------+
| PublicShell                                      |
| EmptyState: no notices                           |
+--------------------------------------------------+
```

### SCR-14 — Complaint step

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-23, flow US-13. A focused step from an Article or a Comment. A reason is required. A blocked User may still file. | Modal, Textarea, Button | wireframe below |
| loading | The POST before 201. | Modal, Skeleton | same as default |
| reason-required | AC-24. 422 `COMPLAINT_REASON_REQUIRED`. Stays. Nothing is stored. | Modal, Textarea, Toast | same as default, plus Toast |
| not-found | 404 `ARTICLE_NOT_FOUND` or `COMMENT_NOT_FOUND`. | Modal, EmptyState | wireframe below |
| theme-applied | AC-04. The step uses the public surface choice. | Modal, Dropdown | same as default |
| locale-fallback | SAD theme branch, missing string. | Modal | same as default |
| N/A: empty | This is a form, not a list. | — | — |
| N/A: success | 201 leaves for the Article. The open Complaint appears on SCR-16. | — | — |
| N/A: guest | 401 leaves for SCR-04. | — | — |
| N/A: rate limit | These complaint POSTs have no 429. | — | — |
| N/A: account-blocked | A blocked User may still file. | — | — |

```text
SCR-14 default
+--------------------------------------------------+
| Modal                                            |
| Textarea: reason                                 |
| Button: submit, Button: back to the Article      |
+--------------------------------------------------+

SCR-14 not-found
+--------------------------------------------------+
| Modal                                            |
| EmptyState: that Article or Comment is not there |
+--------------------------------------------------+
```

### SCR-15 — Second-factor gate

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-30. Opening the admin panel asks Firebase to confirm the second factor. This screen does not choose the factor type. | AdminShell, Button | wireframe below |
| loading | Firebase, then `GET /api/v1/admin/me`. | AdminShell, Skeleton | same as default |
| closed | AC-30. 403 `STAFF_MFA_REQUIRED`. Staff tools stay closed. | AdminShell, Toast | wireframe below |
| refused | AC-28. 403 `STAFF_FORBIDDEN`. The person is not left inside the panel. | AdminShell, Toast | same as closed |
| theme-applied | AC-55. In place on the admin surface. | AdminShell, Dropdown | same as default |
| locale-fallback | AC-55, SAD theme branch. A missing admin string is English. | AdminShell | same as default |
| N/A: empty | This screen is not a list. | — | — |
| N/A: validation | The spec does not define factor fields. | — | — |
| N/A: success | 200 `role` of moderator or administrator leaves for the staff screen they asked for. | — | — |
| N/A: first administrator on this gate | AC-52. The gate has no control that grants Administrator. The refusal code is SCR-21. | — | — |
| N/A: rate limit | `GET /api/v1/admin/me` has no 429. | — | — |

```text
SCR-15 default
+--------------------------------------------------+
| AdminShell                                       |
| Button: confirm the second factor (Firebase)     |
+--------------------------------------------------+

SCR-15 closed / refused
+--------------------------------------------------+
| AdminShell                                       |
| Toast: tools closed, or not left inside          |
+--------------------------------------------------+
```

### SCR-16 — Open complaints

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-23, AC-27. `GET /api/v1/admin/complaints` 200. Complaints that are still open. Opening one goes to SCR-17. | AdminShell, StaffTable, Button, Dropdown | wireframe below |
| loading | That GET before 200. | AdminShell, Skeleton | same as default |
| empty | A 200 page may have no open Complaints. AC-27: matching open Complaints leave this list after a hide. | AdminShell, EmptyState | wireframe below |
| theme-applied | AC-55, flow US-16. | AdminShell, Dropdown | same as default |
| locale-fallback | AC-55. Missing string is English. | AdminShell | same as default |
| N/A: error | This GET has no 429. 401 and 403 return to SCR-15 and do not stay inside the panel. | — | — |
| N/A: validation | This list has no form. A missing reason is SCR-17. | — | — |
| N/A: success | The 200 response is `default` or `empty`. | — | — |
| N/A: moderator figures | Statistics are SCR-23. A Moderator may open this list. | — | — |

```text
SCR-16 default
+--------------------------------------------------+
| AdminShell: complaints, article, categories,     |
| roles, weights, statistics, audit                |
| Theme, Interface language                        |
| StaffTable: open Complaints                      |
| Button: next page                                |
+--------------------------------------------------+

SCR-16 empty
+--------------------------------------------------+
| AdminShell                                       |
| EmptyState: no open Complaints                   |
+--------------------------------------------------+
```

### SCR-17 — Complaint detail

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-27, AC-40, AC-48. One open Complaint. Hide the Article or Comment with a reason, or dismiss with a reason. Links to SCR-18 and SCR-19. | AdminShell, Textarea, Button, Dropdown | wireframe below |
| loading | The hide or dismiss POST before 200. | AdminShell, Skeleton | same as default |
| reason-required | AC-29, AC-49. 422 `REASON_REQUIRED`. Hide does not happen. Dismiss leaves the Complaint open. | AdminShell, Textarea, Toast | same as default, plus Toast |
| not-found | 404 `COMPLAINT_NOT_FOUND`. | AdminShell, EmptyState | wireframe below |
| theme-applied | AC-55. | AdminShell, Dropdown | same as default |
| locale-fallback | AC-55. | AdminShell | same as default |
| N/A: empty | One Complaint is not an empty list. A missing Complaint is `not-found`. | — | — |
| N/A: success | Hide or dismiss 200 leaves for SCR-16. The piece’s public result is SCR-03. The trail row is SCR-24. | — | — |
| N/A: staff gate | 401 and 403 return to SCR-15. | — | — |

```text
SCR-17 default
+--------------------------------------------------+
| AdminShell                                       |
| Complaint reason, target                         |
| Textarea: staff reason                           |
| Button: hide, dismiss, open staff Article, Block |
+--------------------------------------------------+

SCR-17 not-found
+--------------------------------------------------+
| AdminShell                                       |
| EmptyState: no open Complaint                    |
+--------------------------------------------------+
```

### SCR-18 — Staff article

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-27, AC-38. `GET /api/v1/admin/articles/{article_id}` 200. Full text only here. Status is visible. Category move asks for no reason. Staff soft-remove asks for a reason and is Administrator-only. | AdminShell, ArticleBody, Dropdown, Textarea, Button | wireframe below |
| loading | That GET or a write before 200. | AdminShell, Skeleton | same as default |
| category-moved | AC-47. `PATCH` 200. The new Category is shown. No reason was required. Readers see it on SCR-03. | AdminShell, ArticleBody, Dropdown | same as default |
| reason-required | AC-35. Staff soft-remove 422 `REASON_REQUIRED`. The Article is unchanged. | AdminShell, Textarea, Toast | same as default, plus Toast |
| removed | AC-39. Soft-remove 200. `removed_by` is `staff`. The record and the full text remain. | AdminShell, ArticleBody | same as default |
| admin-only | AC-41. A Moderator’s soft-remove returns 403 `ADMIN_ONLY`. Hide stays available on SCR-17. | AdminShell, Toast | same as default, plus Toast |
| not-found | 404 `ARTICLE_NOT_FOUND`, or `CATEGORY_NOT_FOUND` on a move. | AdminShell, EmptyState | wireframe below |
| theme-applied | AC-55. | AdminShell, Dropdown | same as default |
| locale-fallback | AC-55. | AdminShell | same as default |
| N/A: empty | A 200 Article has text for staff. | — | — |
| N/A: success | Category move and soft-remove 200 stay on this screen as `category-moved` and `removed`. | — | — |
| N/A: reason on a Category move | AC-47. The move stands without a reason. | — | — |
| N/A: staff gate | 401 and `STAFF_MFA_REQUIRED` or `STAFF_FORBIDDEN` return to SCR-15. | — | — |

```text
SCR-18 default
+--------------------------------------------------+
| AdminShell                                       |
| ArticleBody: full text, status                   |
| Dropdown: one other Category, Button: move       |
| Textarea: reason, Button: staff soft-remove      |
+--------------------------------------------------+

SCR-18 not-found
+--------------------------------------------------+
| AdminShell                                       |
| EmptyState: Article or Category is not there     |
+--------------------------------------------------+
```

### SCR-19 — Block account

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-31, AC-40. Opened from the author on a Complaint. A reason, then Block. Lift is on this same screen when a Block exists. The User is not staff. | AdminShell, Textarea, Button | wireframe below |
| loading | The block or unblock call before its response. | AdminShell, Skeleton | same as default |
| reason-required | AC-29. 422 `REASON_REQUIRED`. Nobody is blocked. | AdminShell, Textarea, Toast | same as default, plus Toast |
| blocked | AC-31, AC-32. 201. The User cannot publish, Comment, Follow, Like, Bookmark, or send a Direct message. Already published Articles stay visible. Read, own edit, own soft-remove, and a Complaint remain. | AdminShell, Button | same as default |
| lifted | AC-31. Unblock 200. Those stopped actions work again. | AdminShell, Button | same as default |
| not-found | Unblock 404 `BLOCK_NOT_FOUND`. | AdminShell, EmptyState | wireframe below |
| theme-applied | AC-55. | AdminShell, Dropdown | same as default |
| locale-fallback | AC-55. | AdminShell | same as default |
| N/A: empty | The person comes from a Complaint. There is no people directory on this screen. | — | — |
| N/A: success | 201 and the lift 200 are `blocked` and `lifted`. | — | — |
| N/A: staff gate | 401 and 403 `STAFF_MFA_REQUIRED` or `STAFF_FORBIDDEN` return to SCR-15. | — | — |

```text
SCR-19 default
+--------------------------------------------------+
| AdminShell                                       |
| The User from the Complaint                      |
| Textarea: reason                                 |
| Button: Block, or Lift when a Block exists       |
+--------------------------------------------------+

SCR-19 not-found
+--------------------------------------------------+
| AdminShell                                       |
| EmptyState: no Block to lift                     |
+--------------------------------------------------+
```

### SCR-20 — Categories

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-33. An Administrator enters English, Serbian Latin, and Russian names. The service assigns the slug. | AdminShell, Input, Button | wireframe below |
| loading | `POST /api/v1/admin/categories` before 201. | AdminShell, Skeleton | same as default |
| created | AC-33. 201. Stays. The Category is available for new Articles in all three names. | AdminShell, Input, Toast | same as default, plus Toast |
| translations-required | 422 `CATEGORY_TRANSLATIONS_REQUIRED`. A locale or a name is missing. | AdminShell, Input, Toast | same as default, plus Toast |
| admin-only | AC-34. A Moderator receives 403 `ADMIN_ONLY`. | AdminShell, Toast | wireframe below |
| theme-applied | AC-55. | AdminShell, Dropdown | same as default |
| locale-fallback | AC-55. | AdminShell | same as default |
| N/A: empty | This screen is a form. | — | — |
| N/A: success | 201 is `created`, not a second page. | — | — |
| N/A: staff gate | 401 and a missing second factor return to SCR-15. | — | — |

```text
SCR-20 default
+--------------------------------------------------+
| AdminShell                                       |
| Input: English name                              |
| Input: Serbian Latin name                        |
| Input: Russian name                              |
| Button: create                                   |
+--------------------------------------------------+

SCR-20 admin-only
+--------------------------------------------------+
| AdminShell                                       |
| Toast: a Moderator cannot create a Category      |
+--------------------------------------------------+
```

### SCR-21 — Roles

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-50. An Administrator sets one person to exactly one of User, Moderator, or Administrator, with a reason. The contract addresses `user_id`. This screen does not invent a people directory. | AdminShell, Input, Dropdown, Textarea, Button | wireframe below |
| loading | `PUT …/role` before 200. | AdminShell, Skeleton | same as default |
| saved | AC-50. 200. That person holds the new role. The previous role is gone. | AdminShell, Toast | same as default, plus Toast |
| reason-required | AC-35. 422 `REASON_REQUIRED`. The role is unchanged. | AdminShell, Textarea, Toast | same as default, plus Toast |
| last-administrator | AC-51. 409 `LAST_ADMINISTRATOR`. The only Administrator cannot demote themselves. | AdminShell, Toast | same as default, plus Toast |
| first-administrator | AC-52. 403 `FIRST_ADMINISTRATOR_FORBIDDEN`. The panel does not create the first Administrator. | AdminShell, Toast | same as default, plus Toast |
| admin-only | AC-34. A Moderator receives 403 `ADMIN_ONLY`. | AdminShell, Toast | wireframe below |
| theme-applied | AC-55. | AdminShell, Dropdown | same as default |
| locale-fallback | AC-55. | AdminShell | same as default |
| N/A: empty | This screen is a form. | — | — |
| N/A: success | 200 is `saved`. | — | — |
| N/A: people directory | No list-users route exists in the contract. | — | — |
| N/A: staff gate | 401 and a missing second factor return to SCR-15. | — | — |

```text
SCR-21 default
+--------------------------------------------------+
| AdminShell                                       |
| Input: user id                                   |
| Dropdown: User, Moderator, or Administrator      |
| Textarea: reason                                 |
| Button: save                                     |
+--------------------------------------------------+

SCR-21 admin-only
+--------------------------------------------------+
| AdminShell                                       |
| Toast: a Moderator cannot assign a role          |
+--------------------------------------------------+
```

### SCR-22 — Popular weights

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-33. `GET /api/v1/admin/popular-weights` 200. Views, Likes, Comments, Bookmarks, and age decay. Starting numbers stay the seed until a save. The seed values are still an open question in spec §8. | AdminShell, Input, Button | wireframe below |
| loading | The GET or the PUT before 200. | AdminShell, Skeleton | same as default |
| saved | AC-33. PUT 200. Stays. SCR-02 uses the new weights. | AdminShell, Input, Toast | same as default, plus Toast |
| admin-only | AC-34. A Moderator receives 403 `ADMIN_ONLY` on the read or the save. | AdminShell, Toast | wireframe below |
| theme-applied | AC-55. | AdminShell, Dropdown | same as default |
| locale-fallback | AC-55. | AdminShell | same as default |
| N/A: empty | The weights row exists. A Moderator seeing no form is `admin-only`. | — | — |
| N/A: validation | The PUT has no 422. | — | — |
| N/A: success | 200 is `default` on the read and `saved` after the write. | — | — |
| N/A: staff gate | 401 and a missing second factor return to SCR-15. | — | — |

```text
SCR-22 default
+--------------------------------------------------+
| AdminShell                                       |
| Input: views, likes, comments, bookmarks, age    |
| Button: save                                     |
+--------------------------------------------------+

SCR-22 admin-only
+--------------------------------------------------+
| AdminShell                                       |
| Toast: a Moderator cannot change the weights     |
+--------------------------------------------------+
```

### SCR-23 — Statistics

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-53. `GET /api/v1/admin/statistics` 200 for an Administrator. Distinct Users signed in today, distinct Users signed in over the last 30 days, new Users, Articles published, Comments written, Complaints still open, and whether the public site is answering. A zero is still this state. The window for “new” stays the contract’s open point. | AdminShell, Card | wireframe below |
| loading | That GET before 200. | AdminShell, Skeleton | same as default |
| no-figures | AC-54. A Moderator receives 403 `ADMIN_ONLY`. The panel shows no figures. | AdminShell, EmptyState | wireframe below |
| theme-applied | AC-55. | AdminShell, Dropdown | same as default |
| locale-fallback | AC-55. | AdminShell | same as default |
| N/A: empty | Zeros for an Administrator are `default`. The Moderator case is `no-figures`. | — | — |
| N/A: error | This GET has no 429. | — | — |
| N/A: validation | This screen has no form. | — | — |
| N/A: success | The 200 response is `default`. | — | — |
| N/A: staff gate | 401, `STAFF_MFA_REQUIRED`, and `STAFF_FORBIDDEN` return to SCR-15. | — | — |

```text
SCR-23 default
+--------------------------------------------------+
| AdminShell                                       |
| Card: signed in today                            |
| Card: signed in, last 30 days                    |
| Card: new Users                                  |
| Card: Articles published                         |
| Card: Comments written                           |
| Card: open Complaints                            |
| Card: public site answering, yes or no           |
+--------------------------------------------------+

SCR-23 no-figures
+--------------------------------------------------+
| AdminShell                                       |
| EmptyState: no platform statistics               |
+--------------------------------------------------+
```

### SCR-24 — Audit trail

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | AC-36. `GET /api/v1/admin/audit` 200 for an Administrator. Every hide, Block, role change, staff soft-remove, Complaint dismissal, and Category change. A reason is shown where the action recorded one. A Category move may have no reason. | AdminShell, StaffTable, Button | wireframe below |
| own | AC-37. The same GET for a Moderator returns only that Moderator’s rows. Same table. | AdminShell, StaffTable, Button | same as default |
| loading | That GET before 200. | AdminShell, Skeleton | same as default |
| empty | A 200 page may have no rows the caller is allowed to see. | AdminShell, EmptyState | wireframe below |
| theme-applied | AC-55. | AdminShell, Dropdown | same as default |
| locale-fallback | AC-55. | AdminShell | same as default |
| N/A: error | This GET has no 429. | — | — |
| N/A: validation | This screen has no form. | — | — |
| N/A: success | The 200 response is `default`, `own`, or `empty`. | — | — |
| N/A: rewrite or erase | AC-36. The API has no update and no delete. The table has no such control. | — | — |
| N/A: staff gate | 401 and 403 `STAFF_MFA_REQUIRED` or `STAFF_FORBIDDEN` return to SCR-15. | — | — |

```text
SCR-24 default / own
+--------------------------------------------------+
| AdminShell                                       |
| StaffTable: action, actor, entity, reason, time  |
| Button: next page                                |
| no edit, no delete                               |
+--------------------------------------------------+

SCR-24 empty
+--------------------------------------------------+
| AdminShell                                       |
| EmptyState: no audit rows                        |
+--------------------------------------------------+
```

## New components

| Component | Why no existing primitive fits | Registered in design-system |
|---|---|---|
| PublicShell | The public three-column shell is specified in `docs/DESIGN.md`. The shared primitive list has no shell. | pending |
| AdminShell | The admin panel is a separate Vite surface. `PublicShell` is the public site. The shared list has no admin shell. | pending |
| EmptyState | The shared list has no empty-list or empty-page primitive. | pending |
| ArticleBody | The architecture map says article HTML is its own renderer, not a stack of Cards. | pending |
| ArticleEditor | A draft is editor JSON plus a second preview from that same draft. A Textarea cannot reject an embed or raw HTML block. | pending |
| CommentThread | Replies nest through depth 3, and a deeper reply is shown flat. The shared list has no thread. | pending |
| ImageFileInput | Article images are chosen as a file and uploaded through a presigned URL. `Input` is text. | pending |
| StaffTable | Admin complaints and the audit trail are tables. The architecture map names TanStack Table for admin. The shared list has no table, and `Pagination` is the wrong page shape for a cursor list. | pending |

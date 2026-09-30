# API sync report — blog-platform

Derived 2026-09-30 from `data-model.md`, `sad.md` §6, and `spec.md` §4/§5. Size XL. Route full. Interface kind is HTTP plus events: `sad.md` frontmatter `target_surfaces` is `[backend-service, web-frontend, worker]`. The web app consumes this contract. It does not author one.

`data-model.md` is present. Fields come from it. This is not the fast-lane skip.

## Deviations from the template defaults

Recorded because an ADR or the architecture map overrides the skill default.

| Default | This contract | Why |
|---|---|---|
| Error body `{code, message, details?}` and `module.error_name` | `{ "error": { "code", "params" } }` and `SCREAMING_SNAKE` codes. No `message`. | Architecture map, SAD §8, ADR 0010. The only code the repo already names is `ARTICLE_VERSION_CONFLICT`. `params.serverVersion` stays camelCase because that is the worked example in `CLAUDE.md` and `docs/TASK.md`. |
| Cursor `format: uuid` | Opaque string | Fresh orders by `published_at`. Popular orders by score. A bare uuid does not resume either order. |
| Feed `limit` maximum 100 | Maximum 20, default 20 | Spec §6 says a feed page is 20 Articles. The stricter value wins. Other lists stay at maximum 100, default 20. |
| Event envelope snake_case | `eventId`, `eventType`, `eventVersion`, `timestamp`, `producer`, `correlationId`, `causationId` | `docs/architecture-map.md` and SAD §8. |

## Section A — field origins

One row per schema field. Shared schemas are `$ref`'d, so an operation that returns the schema uses these rows. Confidence: high means a `data-model.md` column with the same type or constraint. Medium means a composed or response-only value with a named source. Low means the source does not yet say the shape.

| schema_path | origin | confidence |
|---|---|---|
| Error.error.code | ADR 0010 `ARTICLE_VERSION_CONFLICT`; other codes are proposals, no registry | high for that one code |
| Error.error.params.serverVersion | ADR 0010 and `CLAUDE.md` example | high |
| Error.error.params.action | `users.rate_limit_settings.action` | high |
| PublicAuthor.id, username, display_name, avatar_url | `users.users` columns. Nested because ADR 0003 composes the users service into the Article read | high |
| PublicProfile.* | `users.users` public columns. Omitted when never saved (AC-42), not null | high |
| Me.id, username, display_name, biography, avatar_url, content_languages | `users.users`. `id` and `username` absent before the first save, matching the sequence "a Username is required" | high |
| Me.blocked | `users.blocks` where `lifted_at` is null | medium |
| MeUpdate.* | same columns the profile sequence saves | high |
| ContentLanguageLimit.content_languages | `users.users.content_languages`. Null clears the limit | high |
| Category.id, slug | `categories.categories` | high |
| Category.translations.* | `categories.category_translations` | high |
| CategoryCreate.translations | the create-category sequence requires three names. Slug is not in the request | high |
| ArticleDraft.id, author_id, category_id, slug, language, title, editor_json, rendered_html, version, status, removed_by, published_at, created_at, updated_at | `content.articles` | high |
| ArticleDraft.images | `content.article_images` | high |
| ArticleCreate / ArticleUpdate | the same Article columns the editor sends. `version` is the optimistic lock (ADR 0010) | high |
| ArticlePublished.rendered_html, title, slug, language, category_id | `content.articles` | high |
| ArticlePublished.author | `users.users` via ADR 0003 | high |
| ArticlePublished.images.media_id, position | `content.article_images`. No URL column, so no URL field | high |
| ArticlePublished.like_count, view_count | `engagement.article_stats` | high |
| ArticlePublished.comment_count | composed Comment total. Data-model "comment totals". Not a column on `article_stats` | medium |
| ArticlePublished.liked_by_viewer | existence of `engagement.article_likes` for the caller | medium |
| ArticlePublished.bookmarked_by_viewer | existence of `engagement.bookmarks` for the caller | medium |
| ArticlePublished.comments | `comments.comments` page composed into the read (sequence "reads the Comments") | high |
| ArticleUnavailable | AC-27, AC-38, AC-45. No status column is returned, so the reader is not told which state it is | high |
| ArticleRead.view | response discriminator for the three viewer shapes in those ACs. Not a column | medium |
| ArticleAuthorState.status, removed_by, rendered_html, title, version, images | `content.articles` and `content.article_images`, returned only to the author | high |
| ArticleAuthorState.readers_can_see | derived from status. The author is told that readers cannot see it | medium |
| FeedArticle.* | `content.articles` columns a feed page returns. Counts stay off the card. Bookmark count is not public (AC-01 lists Like, Comment, and View on the Article read, not the feed card) | high |
| FeedPage.next_cursor | cursor wrapper. Opaque because of feed order | high |
| ViewResult.recorded | "Read a published article" alt "same viewer already counted" / "no View yet" | high |
| ArticleLikeState.liked | Like sequence, first call records, second call removes | high |
| ArticleLikeState.like_count | `engagement.article_stats.like_count` | high |
| CommentVisible.* | `comments.comments` plus `comment_mentions` and `comment_like_counts.like_count` | high |
| CommentVisible.liked_by_viewer | existence of `engagement.comment_likes` | medium |
| CommentUnavailable | hide sequence: a non-author sees it unavailable and is not told why | high |
| CommentCreate.body | `comments.comments.body`. Empty body is rejected | high |
| CommentCreate.mentioned_user_ids | `comments.comment_mentions.mentioned_user_id` | high |
| CommentLikeState | `comment_likes` plus `comment_like_counts`. The remove half is the data-model access pattern. AC-17 only shows the add | medium |
| Bookmark.article_id, created_at | `engagement.bookmarks` | high |
| FollowState.following | follow / unfollow sequence | high |
| MediaUpload.id, status | `media.media_objects` | high |
| MediaUpload.upload_url | ADR 0008. Not a column. The browser sends bytes to object storage | high |
| MediaUploadCreate.content_type, byte_size | `media.media_objects` nullable columns, sent so the row can store them | high |
| ConversationSummary.id | `messages.conversations.id` | high |
| ConversationSummary.peer_user_id | the other `conversation_members.user_id` | medium |
| ConversationSummary.unread_count | count of `direct_messages` with `read_at` null. The sequence returns an unread count | medium |
| ConversationCreate.recipient_user_id | the pair key `user_id_low` / `user_id_high` is computed from the two ids | high |
| DirectMessage.* | `messages.direct_messages` | high |
| ConversationRead.read_at | `messages.direct_messages.read_at` | high |
| ComplaintCreate.reason | `article_complaints.reason` / `comment_complaints.reason` | high |
| ComplaintCreated.target_type | which of the two complaint tables. Data-model: the gateway merges the lists | medium |
| ComplaintAdmin.* | the two complaint tables, plus `target_type` | high for columns, medium for `target_type` |
| Notification.* | `notifications.notifications`. No text column | high |
| AdminMe.id, role | `users.users.id`, `users.users.role` | high |
| Reason.reason | required text on hide, Block, role change, staff soft-remove, dismissal | high |
| CategoryMove.category_id | `content.articles.category_id`. `reason` optional, matching the audit note | high |
| RoleAssignment.role, reason | `users.users.role` and the audit reason | high |
| Block.* | `users.blocks` | high |
| PopularWeights.* | `feed.popular_weights` | high |
| PlatformStatistics.users_signed_in_today | distinct `user_sign_ins` for today | high |
| PlatformStatistics.users_signed_in_last_30_days | distinct `user_sign_ins` over 30 days | high |
| PlatformStatistics.new_users | `users.users` counted by `created_at`. The spec does not state a window | low |
| PlatformStatistics.articles_published | published `content.articles` | medium |
| PlatformStatistics.comments_written | `comments.comments` | medium |
| PlatformStatistics.open_complaints | open rows in both complaint tables | high |
| PlatformStatistics.public_site_answering | data-model "Outside PostgreSQL": the site health check | medium |
| AuditEntry.* | `users.admin_audit_log` | high |
| RateLimitSetting.* | `users.rate_limit_settings` | high |
| X-Viewer-Key | Redis key `view:{articleId}:{viewerId}` and AC-02 browser session. Not a column | medium |

No field in the contract is missing an origin. `ArticleImage` deliberately has no `url`. The reader-facing location is unresolved (open question below).

## Section B — drift findings

1. **Endpoint ↔ data-model** — ✓. Every operation reads or writes at least one entity in `data-model.md`. Theme and Interface language have no operation because the data model stores them in the browser and the sequence never calls a service. US-14 has no HTTP operation. Its outcomes are in `events.md`.
2. **Error code ↔ repo error definition** — ✓, with the prescribed note. No error registry, constants file, or `errors` catalog exists in code yet. The architecture map says the client translates `code` from that catalog, and the catalog is not in the repo. `ARTICLE_VERSION_CONFLICT` is the one code already named (ADR 0010, data-model `articles.version`). Every other code is this contract's proposal. Reconcile when the repo defines the catalog.
3. **Validation ↔ constraint** — ✓. Enums match the data model (`role`, `status`, `locale`, `language`, complaint `status`, notification `type`, audit `action`). Text columns have no `maxLength` in the model, so the contract adds none. `comment.body`, message `body`, and `reason` use `minLength: 1` because the service rejects empty text. Feed `limit` maximum is 20. Username has no pattern because uniqueness is exact, including case, and the model states no shape. `content_languages` null means every language. An empty array is rejected.
4. **OpenAPI ↔ sequence** — ✓ for the branches the diagrams draw, with the upstream gaps below saved as open questions rather than silent edits. The "more than one Category" branch cannot be sent, because `category_id` is a single column. The audit rewrite branch has no PATCH or DELETE. A Guest who calls My feed gets 401. The diagram shows the UI not offering the feed. The outcome is the same: the Guest does not see it.

### Open questions

Upstream holes. The contract is not blocked on them. Owner and due follow the skill rule: fix the source, due before the contract is finalized.

| Id | Gap | What the contract does meanwhile | Owner | Due |
|---|---|---|---|---|
| OQ-1 | "Revise a published article" has no stale-save branch. SAD §6 flags that. ADR 0010 and `articles.version` still require `ARTICLE_VERSION_CONFLICT`. | `updateMyArticle` returns 409 with `params.serverVersion`. | sequences | before the contract is finalized |
| OQ-2 | Spec §6.1 and ADR 0009 say an Administrator can change rate limits. US-18's story sentence and §5 have no AC. §6 has no flow. | `listRateLimits` and `updateRateLimit` exist, mapped to §6.1, not to an AC. | specify, sequences | before the contract is finalized |
| OQ-3 | ADR 0007 says the service drops embed and raw HTML blocks. SAD §8 says it rejects them. | The stricter client-visible behavior wins: 422 `ARTICLE_BLOCK_REJECTED`, and the blocks are not stored. | design | before the contract is finalized |
| OQ-4 | `media.media_objects.status` moves from `pending` to `ready`. No sequence says who completes that. | `createMediaUpload` returns `pending` and `upload_url`. There is no complete operation. | sequences | before the contract is finalized |
| OQ-5 | A reply notice opens the Article (sequence). `notifications.entity_type` for that row is `comment`, and the column note says `entity_id` is the Article. | The response returns the stored columns and does not add an `article_id`. | data-model | before the contract is finalized |
| OQ-6 | Idempotency-Key TTL, retry count, and dead-letter queue name are not in §6. | The header is required on outbox writes and on article save. The description says the TTL is unset. `events.md` says the same about retries. | sequences | before the contract is finalized |
| OQ-7 | The Article read shows images. The tables store `media_id` and `position`, not a public URL. | The contract returns those two fields and no URL. | data-model | before the contract is finalized |
| OQ-8 | AC-53 says "how many Users are new" and states no window. | `new_users` is the count of User rows. The description says the window is unset. | specify | before the contract is finalized |
| OQ-9 | ADR 0001 says a new Follow is correct on the next My feed read. ADR 0004 drops cached pages on publish, hide, and soft-remove, not on a Follow. | `social.user.followed` notifies. It does not list feed as a consumer. | design | before the contract is finalized |

### Coverage — spec §5

| AC | Operation or event |
|---|---|
| AC-01 | `getArticleBySlug`, `listArticleComments` |
| AC-02 | `recordArticleView` |
| AC-03 | `listFreshFeed`, `listPopularFeed`. My feed is `listMyFeed` and requires a token |
| AC-04 | No operation. Browser storage. Sequence never calls a service |
| AC-05 | `updateMe`, `getPublicProfile` |
| AC-06 | `updateMe` 409 `USERNAME_TAKEN` |
| AC-07 | `createArticle`, `updateMyArticle`, `createMediaUpload`, `attachArticleImage`, `publishMyArticle` |
| AC-08 | `publishMyArticle` 422 `ARTICLE_CATEGORY_REQUIRED`. A second Category cannot be represented |
| AC-09 | `publishMyArticle` 422 `ARTICLE_TITLE_REQUIRED` |
| AC-10 | `publishMyArticle` 422 `USERNAME_REQUIRED` |
| AC-11 | `updateMyArticle`. No revisions list |
| AC-12 | `getMyArticle` / `updateMyArticle` 403 `ARTICLE_NOT_OWNED` |
| AC-13 | `followUser`, `unfollowUser`, `followCategory`, `unfollowCategory` |
| AC-14 | `listMyFeed` |
| AC-15 | `toggleArticleLike` |
| AC-16 | 401 `AUTH_REQUIRED` on Like, Comment, Follow, Bookmark, publish, and Direct message |
| AC-17 | `createArticleComment`, `createCommentReply`, `toggleCommentLike` |
| AC-18 | 409 `COMMENT_ARTICLE_NOT_VISIBLE` |
| AC-19 | `addBookmark`, `removeBookmark`, `listMyBookmarks` |
| AC-20 | `listMyBookmarks` is the caller's path. A Guest gets 401. A different User cannot address it |
| AC-21 | `createConversation`, `listConversations`, `listConversationMessages`, `markConversationRead` |
| AC-22 | 422 `MESSAGE_BODY_REQUIRED` |
| AC-23 | `createArticleComplaint`, `createCommentComplaint`, `listOpenComplaints` |
| AC-24 | 422 `COMPLAINT_REASON_REQUIRED` |
| AC-25 | `events.md` realtime pushes. View count is not pushed |
| AC-26 | `listNotifications`. No email field and no phone field |
| AC-27 | `hideArticle`, `hideComment`, public unavailable shape, `getAdminArticle`, `getAdminComment` |
| AC-28 | 403 `STAFF_FORBIDDEN` |
| AC-29 | 422 `REASON_REQUIRED` on hide and Block |
| AC-30 | 403 `STAFF_MFA_REQUIRED` |
| AC-31 | `blockUser`, `unblockUser`, 403 `ACCOUNT_BLOCKED` on the participation writes. Edit, withdraw, and Complaint stay allowed |
| AC-32 | public `getArticleBySlug` still returns a published Article after a Block |
| AC-33 | `createCategory`, `assignRole`, `updatePopularWeights` |
| AC-34 | 403 `ADMIN_ONLY` |
| AC-35 | 422 `REASON_REQUIRED` on `assignRole` and `staffSoftRemoveArticle` |
| AC-36 | `listAuditTrail` for an Administrator |
| AC-37 | `listAuditTrail` filtered to the Moderator's `actor_id`. No update or delete |
| AC-38 | `withdrawMyArticle`, then `ArticleUnavailable` for other readers |
| AC-39 | `staffSoftRemoveArticle` |
| AC-40 | `hideArticle`, `hideComment`, `blockUser` |
| AC-41 | `withdrawMyArticle` 403 for a different User or a Moderator. Hide stays available |
| AC-42 | `updateMe`, `getPublicProfile` omits unsaved fields |
| AC-43 | `publishMyArticle` with `images: []` |
| AC-44 | 422 `ARTICLE_TEXT_REQUIRED` |
| AC-45 | `getArticleById` unavailable for a non-author. `getMyArticle` for the author |
| AC-46 | `updateContentLanguages` plus the three feed reads |
| AC-47 | `moveArticleCategory` without a reason |
| AC-48 | `dismissComplaint` |
| AC-49 | 422 `REASON_REQUIRED` on dismiss. The Complaint stays open |
| AC-50 | `assignRole` |
| AC-51 | 409 `LAST_ADMINISTRATOR` |
| AC-52 | 403 `FIRST_ADMINISTRATOR_FORBIDDEN` |
| AC-53 | `getPlatformStatistics` |
| AC-54 | 403 `ADMIN_ONLY` |
| AC-55 | No operation. Same browser storage as AC-04, on the admin panel |

### Coverage — user stories

| Story | Operations |
|---|---|
| US-01 | `getArticleBySlug`, `getArticleById`, `recordArticleView`, `listArticleComments` |
| US-02 | `listFreshFeed`, `listPopularFeed` |
| US-03 | none — browser |
| US-04 | `getMe`, `updateMe`, `getPublicProfile` |
| US-05 | `createArticle`, `updateMyArticle`, `publishMyArticle`, `createMediaUpload`, `attachArticleImage`, `listCategories` |
| US-06 | `getMyArticle`, `updateMyArticle` |
| US-07 | `followUser`, `unfollowUser`, `followCategory`, `unfollowCategory`, `getCategory` |
| US-08 | `listMyFeed`, `updateContentLanguages` |
| US-09 | `toggleArticleLike` |
| US-10 | `createArticleComment`, `createCommentReply`, `toggleCommentLike` |
| US-11 | `addBookmark`, `removeBookmark`, `listMyBookmarks` |
| US-12 | `listConversations`, `createConversation`, `listConversationMessages`, `createDirectMessage`, `markConversationRead` |
| US-13 | `createArticleComplaint`, `createCommentComplaint`, `listOpenComplaints` |
| US-14 | realtime pushes in `events.md` |
| US-15 | `listNotifications` |
| US-16 | `getAdminMe`, `hideArticle`, `hideComment`, `getAdminArticle`, `getAdminComment`, `moveArticleCategory` |
| US-17 | `blockUser`, `unblockUser` |
| US-18 | `createCategory`, `assignRole`, `getPopularWeights`, `updatePopularWeights`, `getPlatformStatistics`, `staffSoftRemoveArticle`, `dismissComplaint`, `listRateLimits`, `updateRateLimit` |
| US-19 | `listAuditTrail` |
| US-20 | `withdrawMyArticle` |

`listRateLimits` and `updateRateLimit` are the §6.1 settings write. They do not have an AC (OQ-2). `getPopularWeights` is the read of the same row `updatePopularWeights` replaces. The change sequence does not draw that read.

### Idempotency-Key

Required only where the data model inserts an outbox row, or where ADR 0010 says the article save is retried:

`updateMyArticle`, `publishMyArticle`, `withdrawMyArticle`, `hideArticle`, `staffSoftRemoveArticle`, `createArticleComment`, `createCommentReply`, `hideComment`, `toggleArticleLike`, `followUser`, `createConversation`, `createDirectMessage`.

Comment Likes, Bookmarks, Category follows, unfollows, Blocks, role changes, Category creates, and the read mark do not insert an outbox row. They do not require the header.

### Proposed error codes

No registry to check. These are the contract's proposal, plus `ARTICLE_VERSION_CONFLICT`.

`AUTH_REQUIRED`, `ACCOUNT_BLOCKED`, `STAFF_MFA_REQUIRED`, `STAFF_FORBIDDEN`, `ADMIN_ONLY`, `ARTICLE_NOT_OWNED`, `ARTICLE_NOT_FOUND`, `ARTICLE_VERSION_CONFLICT`, `ARTICLE_BLOCK_REJECTED`, `ARTICLE_CATEGORY_REQUIRED`, `ARTICLE_TITLE_REQUIRED`, `ARTICLE_TEXT_REQUIRED`, `ARTICLE_LANGUAGE_REQUIRED`, `USERNAME_TAKEN`, `USERNAME_REQUIRED`, `CONTENT_LANGUAGE_INVALID`, `COMMENT_ARTICLE_NOT_VISIBLE`, `COMMENT_BODY_REQUIRED`, `COMMENT_NOT_FOUND`, `MESSAGE_BODY_REQUIRED`, `CONVERSATION_NOT_FOUND`, `COMPLAINT_REASON_REQUIRED`, `COMPLAINT_NOT_FOUND`, `REASON_REQUIRED`, `CATEGORY_NOT_FOUND`, `CATEGORY_TRANSLATIONS_REQUIRED`, `USER_NOT_FOUND`, `MEDIA_NOT_FOUND`, `BLOCK_NOT_FOUND`, `RATE_LIMIT_NOT_FOUND`, `RATE_LIMITED`, `LAST_ADMINISTRATOR`, `FIRST_ADMINISTRATOR_FORBIDDEN`.

import { z } from 'zod'
import { blocksDocumentSchema } from './blocks.ts'
import { articleVisibilitySchema, feedCardSchema, reactionCountsSchema } from './feed.ts'

export const articleStatusSchema = z.enum(['draft', 'published', 'hidden', 'deleted'])

const authorSchema = z.strictObject({
  user_id: z.uuid(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  slug: z.string(),
})

const topicSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(['active', 'archived']),
})

/** Полная статья для «Показать полностью» и страницы `/p/{slug}`. */
export const articleSchema = z.strictObject({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  blocks: blocksDocumentSchema,
  author: authorSchema,
  topic: topicSchema,
  published_at: z.iso.datetime().nullable(),
  visibility: articleVisibilitySchema,
  comments_enabled: z.boolean(),
  status: articleStatusSchema,
  reaction_counts: reactionCountsSchema,
  reaction_count: z.number().int().nonnegative(),
  comment_count: z.number().int().nonnegative(),
  bookmark_count: z.number().int().nonnegative(),
  view_count: z.number().int().nonnegative(),
  is_own: z.boolean(),
})
export type Article = z.infer<typeof articleSchema>

/** Отказ без текста и блоков: гость на `members` либо статья недоступна. */
export const articleUnavailableSchema = z.strictObject({
  reason: z.enum(['members_only', 'unavailable']),
})
export type ArticleUnavailable = z.infer<typeof articleUnavailableSchema>

/** Черновик и публикация. `visibility` и комментарии имеют значения по умолчанию только при создании. */
export const createArticleSchema = z.strictObject({
  title: z.string().min(1).max(150),
  topic_id: z.uuid(),
  blocks: blocksDocumentSchema,
  visibility: articleVisibilitySchema.default('public'),
  comments_enabled: z.boolean().default(true),
  slug: z.string().optional(),
})
export type CreateArticle = z.infer<typeof createArticleSchema>

/** Частичное сохранение. Поле попадает в запись, только если автор его прислал. */
export const updateArticleSchema = z.strictObject({
  title: z.string().min(1).max(150).optional(),
  topic_id: z.uuid().optional(),
  blocks: blocksDocumentSchema.optional(),
  visibility: articleVisibilitySchema.optional(),
  comments_enabled: z.boolean().optional(),
  slug: z.string().optional(),
})
export type UpdateArticle = z.infer<typeof updateArticleSchema>

/** Черновик автора: полный документ, без публичной карточки. */
export const articleDraftSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  blocks: blocksDocumentSchema,
  topic_id: z.uuid(),
  visibility: articleVisibilitySchema,
  comments_enabled: z.boolean(),
  slug: z.string(),
  status: articleStatusSchema,
})
export type ArticleDraft = z.infer<typeof articleDraftSchema>

/** `GET /v1/articles?ids=` — карточки в порядке запроса, без недоступных зрителю. */
export const articleCardsSchema = z.strictObject({
  items: z.array(feedCardSchema),
})
export type ArticleCards = z.infer<typeof articleCardsSchema>

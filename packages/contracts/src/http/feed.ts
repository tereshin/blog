import { z } from 'zod'
import { pageSchema } from './pagination.ts'

/** Четыре исходных вида. Новые реакции получают UUID, эти slug остаются у уже поставленных. */
export const REACTION_KINDS = ['laugh', 'heart', 'thumb', 'fire'] as const

const LEGACY_REACTION_KINDS = new Set<string>(REACTION_KINDS)

/** Стабильный идентификатор: `laugh` | `heart` | `thumb` | `fire` либо UUID новой реакции. */
export const reactionKindSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => LEGACY_REACTION_KINDS.has(value) || z.uuid().safeParse(value).success, {
    message: 'Идентификатор реакции должен быть одним из четырёх исходных или UUID',
  })
export type ReactionKind = z.infer<typeof reactionKindSchema>

/** Числа по видам. Ключа нет — реакций этого вида ноль. */
export const reactionCountsSchema = z.record(reactionKindSchema, z.number().int().nonnegative())
export type ReactionCounts = z.infer<typeof reactionCountsSchema>

export function sumReactionCounts(counts: ReactionCounts): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0)
}

/** `fresh` | `popular` | `mine` | `topic:{slug}` — параметр `mode` у `GET /v1/feed`. */
export const feedModeSchema = z.union([z.enum(['fresh', 'popular', 'mine']), z.string().regex(/^topic:[a-z0-9][a-z0-9-]*$/)])
export type FeedMode = z.infer<typeof feedModeSchema>

export const topicStatusSchema = z.enum(['active', 'archived'])
export const articleVisibilitySchema = z.enum(['public', 'members', 'author'])

export const feedCardSchema = z.strictObject({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  /** Есть содержимое, которое не помещается во фрагмент и первое изображение. */
  has_more_content: z.boolean().optional(),
  first_image_url: z.string().nullable(),
  published_at: z.iso.datetime(),
  author: z.strictObject({
    user_id: z.uuid(),
    display_name: z.string(),
    avatar_url: z.string().nullable(),
    /** Короткий адрес профиля или номер учётной записи (`/u/{slug}`). */
    slug: z.string(),
    /** Выбранная иконка статуса профиля. `null` — статус не задан. */
    status_icon_id: z.uuid().nullable(),
  }),
  topic: z.strictObject({
    id: z.uuid(),
    title: z.string(),
    slug: z.string(),
    status: topicStatusSchema,
    avatar_url: z.string().nullable().optional(),
  }),
  reaction_counts: reactionCountsSchema,
  reaction_count: z.number().int().nonnegative(),
  comment_count: z.number().int().nonnegative(),
  bookmark_count: z.number().int().nonnegative(),
  view_count: z.number().int().nonnegative(),
  top_comment: z
    .strictObject({
      id: z.uuid(),
      author_name: z.string(),
      author_avatar_url: z.string().nullable(),
      excerpt: z.string(),
    })
    .nullable(),
  visibility: articleVisibilitySchema,
  comments_enabled: z.boolean(),
})
export type FeedCard = z.infer<typeof feedCardSchema>

export const feedPageSchema = pageSchema(feedCardSchema).extend({
  /** Пустая «Моя лента» участника, у которого нет подписок. */
  reason: z.enum(['no_follows']).optional(),
})
export type FeedPage = z.infer<typeof feedPageSchema>

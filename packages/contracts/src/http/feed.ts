import { z } from 'zod'
import { pageSchema } from './pagination.ts'

export const REACTION_KINDS = ['laugh', 'heart', 'thumb', 'fire'] as const
export const reactionKindSchema = z.enum(REACTION_KINDS)
export type ReactionKind = z.infer<typeof reactionKindSchema>

export const reactionCountsSchema = z.strictObject({
  laugh: z.number().int().nonnegative(),
  heart: z.number().int().nonnegative(),
  thumb: z.number().int().nonnegative(),
  fire: z.number().int().nonnegative(),
})
export type ReactionCounts = z.infer<typeof reactionCountsSchema>

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
  first_image_url: z.string().nullable(),
  published_at: z.iso.datetime(),
  author: z.strictObject({
    user_id: z.uuid(),
    display_name: z.string(),
    avatar_url: z.string().nullable(),
    /** Короткий адрес профиля или номер учётной записи (`/u/{slug}`). */
    slug: z.string(),
  }),
  topic: z.strictObject({
    id: z.uuid(),
    title: z.string(),
    slug: z.string(),
    status: topicStatusSchema,
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

import { z } from 'zod'
import { feedCardSchema } from './feed.ts'
import { pageSchema } from './pagination.ts'

/** 3–40: латиница, цифры и дефис, дефис не с краю. Совпадает с реестром адресов content-service. */
export const PROFILE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

export const PROFILE_BADGES = ['first_post', 'ten_reactions', 'one_year'] as const
export const profileBadgeSchema = z.enum(PROFILE_BADGES)
export type ProfileBadge = z.infer<typeof profileBadgeSchema>

export const profileSchema = z.strictObject({
  user_id: z.uuid(),
  public_number: z.number().int().positive(),
  display_name: z.string(),
  bio: z.string().nullable(),
  avatar_url: z.string().nullable(),
  cover_url: z.string().nullable(),
  status_icon_id: z.uuid().nullable().default(null),
  slug: z.string().nullable(),
  reputation: z.number().int(),
  created_at: z.iso.datetime(),
  followers_count: z.number().int().nonnegative(),
  following_count: z.number().int().nonnegative(),
  badges: z.array(profileBadgeSchema),
  is_own: z.boolean(),
  is_following: z.boolean(),
})
export type Profile = z.infer<typeof profileSchema>

/** Частичное обновление: смена изображения не перезаписывает остальные поля профиля. */
export const updateProfileSchema = z.strictObject({
  display_name: z.string().trim().min(1).max(50),
  bio: z.string().max(500).nullable(),
  avatar_url: z.string().nullable(),
  cover_url: z.string().nullable(),
  slug: z.string().regex(PROFILE_SLUG_PATTERN).nullable(),
  status_icon_id: z.uuid().nullable(),
}).partial().refine((input) => Object.values(input).some((value) => value !== undefined), {
  message: 'Укажите хотя бы одно поле профиля',
})
export type UpdateProfile = z.infer<typeof updateProfileSchema>

/** Карточка профиля: та же ленточная карточка плюс состояние, которое видит владелец. */
export const profileArticleSchema = feedCardSchema.extend({
  status: z.enum(['draft', 'published', 'hidden']),
  published_at: z.iso.datetime().nullable(),
})
export type ProfileArticle = z.infer<typeof profileArticleSchema>

export const profileArticlePageSchema = pageSchema(profileArticleSchema)
export type ProfileArticlePage = z.infer<typeof profileArticlePageSchema>

export const userListItemSchema = z.strictObject({
  user_id: z.uuid(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  slug: z.string(),
  reputation: z.number().int(),
})
export type UserListItem = z.infer<typeof userListItemSchema>

export const userListPageSchema = pageSchema(userListItemSchema)
export type UserListPage = z.infer<typeof userListPageSchema>

export const profileStatsSchema = z.strictObject({
  view_count: z.number().int().nonnegative(),
  reaction_count: z.number().int().nonnegative(),
  followers_count: z.number().int().nonnegative(),
})
export type ProfileStats = z.infer<typeof profileStatsSchema>

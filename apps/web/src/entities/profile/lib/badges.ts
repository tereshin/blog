import type { MessageKey } from '@/shared/i18n'

export const PROFILE_BADGES = ['first_post', 'ten_reactions', 'one_year'] as const
export type ProfileBadgeId = (typeof PROFILE_BADGES)[number]

export const badgeCatalog: Record<ProfileBadgeId, { label_key: MessageKey; src: string }> = {
  first_post: { label_key: 'badge.first_post', src: '/badges/first_post.svg' },
  ten_reactions: { label_key: 'badge.ten_reactions', src: '/badges/ten_reactions.svg' },
  one_year: { label_key: 'badge.one_year', src: '/badges/one_year.svg' },
}

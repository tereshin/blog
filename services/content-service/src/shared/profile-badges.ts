import type { BadgeDefinition } from '@blog/contracts'

export const DEFAULT_PROFILE_BADGES: BadgeDefinition[] = [
  {
    id: 'first_post',
    label: 'Первая публикация',
    image_url: '/badges/first_post.svg',
    status: 'active',
    trigger: { metric: 'published_posts', threshold: 1 },
  },
  {
    id: 'ten_reactions',
    label: 'Десять реакций',
    image_url: '/badges/ten_reactions.svg',
    status: 'active',
    trigger: { metric: 'reputation', threshold: 10 },
  },
  {
    id: 'one_year',
    label: 'Год на площадке',
    image_url: '/badges/one_year.svg',
    status: 'active',
    trigger: { metric: 'membership_months', threshold: 12 },
  },
]

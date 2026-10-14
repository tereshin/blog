import { PROFILE_BADGES } from '@blog/contracts'
import type { MessageKey } from '@/shared/i18n'

/** Presentation fallback for servers predating the configurable catalog; no award rules. */
export function legacyBadgeViews(badges: string[], translate: (key: MessageKey) => string) {
  return PROFILE_BADGES.filter((id) => badges.includes(id)).map((id) => ({
    id,
    label: translate(`badge.${id}`),
    image_url: `/badges/${id}.svg`,
  }))
}

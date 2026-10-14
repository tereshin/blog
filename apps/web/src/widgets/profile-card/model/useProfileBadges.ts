import { useSettings } from '@/entities/settings'
import { useT } from '@/shared/i18n'
import { legacyBadgeViews } from '@/entities/profile'
import type { ProfileBadge } from '@/entities/profile'

export function useProfileBadges(badges: ProfileBadge[]) {
  const settings = useSettings()
  const { t } = useT()
  if (settings.data?.profile_badges === null) return legacyBadgeViews(badges, t)
  return (settings.data?.profile_badges ?? []).filter((item) => badges.includes(item.id))
}

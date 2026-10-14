import { useSettings } from '@/entities/settings'
import type { ProfileBadge } from '@/entities/profile'

export function useProfileBadges(badges: ProfileBadge[]) {
  const settings = useSettings()
  return (settings.data?.profile_badges ?? []).filter((item) => badges.includes(item.id))
}

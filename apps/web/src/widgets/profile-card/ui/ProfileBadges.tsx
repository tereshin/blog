import type { ProfileBadge } from '@/entities/profile'
import { Tooltip } from '@/shared/ui'
import { useProfileBadges } from '../model/useProfileBadges.ts'

type ProfileBadgesProps = { badges: ProfileBadge[] }

export function ProfileBadges({ badges }: ProfileBadgesProps) {
  const items = useProfileBadges(badges)
  if (items.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2 -mx-1">
      {items.map((item) => {
        return (
          <li key={item.id}>
            <Tooltip delay={0}>
              <Tooltip.Trigger
                aria-label={item.label}
                className="grid size-10 place-items-center rounded-avatar outline-offset-2 hover:bg-surface-secondary"
              >
                <img loading="lazy" src={item.image_url} alt="" width={32} height={32} className="size-8 object-contain" />
              </Tooltip.Trigger>
              <Tooltip.Content>{item.label}</Tooltip.Content>
            </Tooltip>
          </li>
        )
      })}
    </ul>
  )
}

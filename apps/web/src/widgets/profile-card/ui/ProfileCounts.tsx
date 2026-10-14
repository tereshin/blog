import type { Profile } from '@/entities/profile'
import { Link } from 'react-router'
import { useT } from '@/shared/i18n'

type ProfileCountsProps = { profile: Profile; address: string }

export function ProfileCounts({ profile, address }: ProfileCountsProps) {
  const { t } = useT()
  return (
    <p className="flex flex-wrap gap-3 text-base">
      <Link to={`/u/${address}/followers`} className="outline-offset-2">
        {t('profile.followers', { count: profile.followers_count })}
      </Link>
      <Link to={`/u/${address}/following`} className="outline-offset-2">
        {t('profile.following', { count: profile.following_count })}
      </Link>
    </p>
  )
}

import type { Profile } from '@/entities/profile'
import { formatReputation } from '@/entities/profile'
import { useT } from '@/shared/i18n'

type ProfileReputationProps = { profile: Profile }

export function ProfileReputation({ profile }: ProfileReputationProps) {
  const { t } = useT()
  const year = new Date(profile.created_at).getUTCFullYear()
  return (
    <p className="flex items-center gap-2 text-base">
      <span className="font-medium text-positive">{formatReputation(profile.reputation)}</span>
      <span className="text-muted">{t('profile.since', { year })}</span>
    </p>
  )
}

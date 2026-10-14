import { FollowButton } from '@/features/follow'
import { useT } from '@/shared/i18n'

type DiscoveryFollowProps = {
  target_type: 'user' | 'topic'
  target_id: string
  is_own?: boolean
}

export function DiscoveryFollow({ target_type, target_id, is_own = false }: DiscoveryFollowProps) {
  const { t } = useT()
  return (
    <FollowButton
      target_type={target_type}
      target_id={target_id}
      is_following={false}
      is_own={is_own}
      variant="primary"
      size="sm"
    >
      {(is_following) => t(is_following ? 'discovery.unfollow' : 'profile.follow')}
    </FollowButton>
  )
}

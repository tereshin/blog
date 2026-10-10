import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { useFollow } from '../model/useFollow.ts'
import type { FollowTarget } from '../model/useFollow.ts'

type FollowButtonProps = FollowTarget & { is_own: boolean }

/** Пилюля «Подписаться» / «Вы подписаны». На своей карточке и своём профиле не показывается. */
export function FollowButton({ is_own, ...target }: FollowButtonProps) {
  const { t } = useT()
  const follow = useFollow(target)
  if (is_own) return null
  return (
    <Button
      variant="secondary"
      shape="pill"
      size="sm"
      aria-pressed={follow.is_following}
      isDisabled={follow.is_pending}
      onPress={follow.toggle}
    >
      {t(follow.is_following ? 'profile.following_now' : 'profile.follow')}
    </Button>
  )
}

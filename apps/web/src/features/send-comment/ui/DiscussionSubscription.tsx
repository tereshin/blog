import { useT } from '@/shared/i18n'
import { BaseIcon, Button } from '@/shared/ui'
import { useDiscussionSubscription } from '../model/useDiscussionSubscription.ts'
export function DiscussionSubscription({ article_id }: { article_id: string }) {
  const { t } = useT()
  const { enabled, is_pending, toggle } = useDiscussionSubscription(article_id)
  return (
    <Button
      variant="ghost"
      size="sm"
      className="self-end text-muted"
      aria-pressed={enabled}
      isDisabled={is_pending}
      onPress={toggle}
    >
      <BaseIcon name="notification" style={enabled ? 'fill' : 'line'} size={18} />
      {t(enabled ? 'comment.unsubscribe' : 'comment.subscribe')}
    </Button>
  )
}

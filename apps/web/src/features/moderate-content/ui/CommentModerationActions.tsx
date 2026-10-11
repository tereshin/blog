import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { useModerateComment } from '../model/useModerateArticle.ts'

type CommentActionsProps = {
  article_id: string
  comment_id: string
  status: 'visible' | 'hidden' | 'deleted' | 'pending'
}

/** Скрыть, вернуть или удалить комментарий. */
export function CommentModerationActions({ article_id, comment_id, status }: CommentActionsProps) {
  const { t } = useT()
  const actions = useModerateComment(article_id)
  if (status === 'deleted' || status === 'pending') return null
  return (
    <div className="flex flex-wrap gap-2">
      {status === 'visible' ? (
        <Button
          variant="ghost"
          isDisabled={
            actions.hide.isPending || actions.restore.isPending || actions.remove.isPending
          }
          onPress={() => actions.hide.mutate(comment_id)}
        >
          {t('admin.moderation.hide')}
        </Button>
      ) : (
        <Button
          variant="ghost"
          isDisabled={
            actions.hide.isPending || actions.restore.isPending || actions.remove.isPending
          }
          onPress={() => actions.restore.mutate(comment_id)}
        >
          {t('admin.moderation.restore')}
        </Button>
      )}
      <Button
        variant="ghost"
        isDisabled={actions.remove.isPending}
        onPress={() => actions.remove.mutate(comment_id)}
      >
        {t('admin.moderation.delete')}
      </Button>
    </div>
  )
}

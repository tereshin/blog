import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'
import { useModerateArticle, useModerateComment } from '../model/useModerateArticle.ts'

type ArticleActionsProps = {
  article_id: string
  status: 'draft' | 'published' | 'hidden' | 'deleted'
}

/** Кнопки модератора у статьи: скрыть, вернуть или удалить после подтверждения. */
export function ArticleModerationActions({ article_id, status }: ArticleActionsProps) {
  const { t } = useT()
  const actions = useModerateArticle()
  const [confirm_delete, setConfirmDelete] = useState(false)
  return (
    <div className="flex flex-wrap gap-2">
      {status === 'published' ? (
        <Button variant="secondary" isDisabled={actions.hide.isPending} onPress={() => actions.hide.mutate(article_id)}>
          {t('admin.moderation.hide')}
        </Button>
      ) : null}
      {status === 'hidden' ? (
        <Button variant="secondary" isDisabled={actions.restore.isPending} onPress={() => actions.restore.mutate(article_id)}>
          {t('admin.moderation.restore')}
        </Button>
      ) : null}
      <Button variant="danger" onPress={() => setConfirmDelete(true)}>
        {t('admin.moderation.delete')}
      </Button>
      <Dialog is_open={confirm_delete} onOpenChange={setConfirmDelete}>
        <Dialog.Header>
          <Dialog.Heading>{t('admin.moderation.delete')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          <p>{t('admin.moderation.confirm_delete')}</p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="ghost" slot="close">
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            isDisabled={actions.remove.isPending}
            onPress={() => {
              actions.remove.mutate(article_id)
              setConfirmDelete(false)
            }}
          >
            {t('admin.moderation.delete')}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </div>
  )
}

type CommentActionsProps = { article_id: string; comment_id: string; status: 'visible' | 'hidden' | 'deleted' | 'pending' }

/** Скрыть, вернуть или удалить комментарий. */
export function CommentModerationActions({ article_id, comment_id, status }: CommentActionsProps) {
  const { t } = useT()
  const actions = useModerateComment(article_id)
  if (status === 'deleted' || status === 'pending') return null
  return (
    <div className="flex flex-wrap gap-2">
      {status === 'visible' ? (
        <Button variant="ghost" isDisabled={actions.hide.isPending} onPress={() => actions.hide.mutate(comment_id)}>
          {t('admin.moderation.hide')}
        </Button>
      ) : (
        <Button variant="ghost" isDisabled={actions.restore.isPending} onPress={() => actions.restore.mutate(comment_id)}>
          {t('admin.moderation.restore')}
        </Button>
      )}
      <Button variant="ghost" isDisabled={actions.remove.isPending} onPress={() => actions.remove.mutate(comment_id)}>
        {t('admin.moderation.delete')}
      </Button>
    </div>
  )
}

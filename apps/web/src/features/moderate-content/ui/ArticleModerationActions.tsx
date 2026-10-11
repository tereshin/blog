import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'
import { useModerateArticle } from '../model/useModerateArticle.ts'

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
        <Button
          variant="secondary"
          isDisabled={
            actions.hide.isPending || actions.restore.isPending || actions.remove.isPending
          }
          onPress={() => actions.hide.mutate(article_id)}
        >
          {t('admin.moderation.hide')}
        </Button>
      ) : null}
      {status === 'hidden' ? (
        <Button
          variant="secondary"
          isDisabled={
            actions.hide.isPending || actions.restore.isPending || actions.remove.isPending
          }
          onPress={() => actions.restore.mutate(article_id)}
        >
          {t('admin.moderation.restore')}
        </Button>
      ) : null}
      <Button
        variant="danger"
        isDisabled={actions.hide.isPending || actions.restore.isPending || actions.remove.isPending}
        onPress={() => setConfirmDelete(true)}
      >
        {t('admin.moderation.delete')}
      </Button>
      {actions.hide.isError || actions.restore.isError || actions.remove.isError ? (
        <p role="alert" className="w-full text-sm text-danger">
          {t('error.unknown')}
        </p>
      ) : null}
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
              actions.remove.mutate(article_id, { onSuccess: () => setConfirmDelete(false) })
            }}
          >
            {t('admin.moderation.delete')}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </div>
  )
}

import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'
import { useReviewReport } from '../model/useReviewReport.ts'
export function ReportActions({
  id,
  kind,
  status,
}: {
  id: string
  kind: 'article' | 'comment'
  status: 'open' | 'reviewed'
}) {
  const { t } = useT()
  const mutation = useReviewReport(kind)
  const [confirm_delete, setConfirmDelete] = useState(false)
  if (status === 'reviewed') return null
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="secondary"
        isDisabled={mutation.isPending}
        onPress={() => mutation.mutate({ id, action: 'dismiss' })}
      >
        {t('comment.report_dismiss')}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        isDisabled={mutation.isPending}
        onPress={() => mutation.mutate({ id, action: 'hide' })}
      >
        {t('admin.moderation.hide')}
      </Button>
      <Button
        size="sm"
        variant="danger"
        isDisabled={mutation.isPending}
        onPress={() => setConfirmDelete(true)}
      >
        {t('admin.moderation.delete')}
      </Button>
      {mutation.isError ? (
        <p role="alert" className="text-sm text-danger">
          {t('error.unknown')}
        </p>
      ) : null}
      <Dialog is_open={confirm_delete} onOpenChange={setConfirmDelete}>
        <Dialog.Header>
          <Dialog.Heading>{t('admin.moderation.delete')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>{t('admin.moderation.confirm_delete')}</Dialog.Body>
        <Dialog.Footer>
          <Button variant="ghost" onPress={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            isDisabled={mutation.isPending}
            onPress={() =>
              mutation.mutate(
                { id, action: 'delete' },
                { onSuccess: () => setConfirmDelete(false) },
              )
            }
          >
            {t('admin.moderation.delete')}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </div>
  )
}

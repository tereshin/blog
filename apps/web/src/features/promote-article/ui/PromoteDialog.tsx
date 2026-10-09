import { useState } from 'react'
import { useViewer } from '@/entities/session'
import { ApiError, sessionEvents } from '@/shared/api'
import { formatTime } from '@/shared/lib'
import { useT } from '@/shared/i18n'
import { Button, Dialog, useToast } from '@/shared/ui'
import { usePromoteArticle } from '../model/usePromoteArticle.ts'

type PromoteDialogProps = { article_id: string }

/** «Купить показы»: один пакет, без оплаты, 7 дней в «Популярном». */
export function PromoteDialog({ article_id }: PromoteDialogProps) {
  const { t } = useT()
  const toast = useToast()
  const { viewer } = useViewer()
  const [is_open, setOpen] = useState(false)
  const promote = usePromoteArticle(article_id)

  const open = () => {
    if (viewer.status === 'guest') {
      sessionEvents.emit('login_required')
      return
    }
    if (viewer.status !== 'member') return
    setOpen(true)
  }

  const confirm = () => {
    promote.mutate(undefined, {
      onSuccess: (response) => {
        setOpen(false)
        toast.success(t('promotion.confirmed', { until: formatTime(response.until) }))
      },
      onError: (error) => toast.error(error instanceof ApiError ? error.message : t('promotion.failed')),
    })
  }

  return (
    <>
      <Button variant="primary" shape="pill" onPress={open}>
        {t('profile.buy_views')}
      </Button>
      <Dialog is_open={is_open} onOpenChange={setOpen}>
        <Dialog.Header>
          <Dialog.Heading>{t('promotion.title')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          <p>{t('promotion.package')}</p>
          <p className="text-muted">{t('promotion.unpaid')}</p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="ghost" slot="close">
            {t('common.cancel')}
          </Button>
          <Button variant="primary" isDisabled={promote.isPending} onPress={confirm}>
            {t('common.confirm')}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </>
  )
}

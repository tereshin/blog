import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { useViewer } from '@/entities/session'
import { ApiError, http, sessionEvents } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { Button, Dialog, useToast } from '@/shared/ui'

const reportSchema = z.object({ id: z.string() })

type ReportMenuItemProps = { article_id: string; is_open: boolean; onOpenChange: (is_open: boolean) => void }

/** Подтверждение жалобы. Пункт меню открывает это окно снаружи, чтобы не ломать список пунктов. */
export function ReportDialog({ article_id, is_open, onOpenChange }: ReportMenuItemProps) {
  const { t } = useT()
  const toast = useToast()
  const { viewer } = useViewer()
  const report = useMutation({
    mutationFn: () => http.post(`/v1/articles/${article_id}/reports`, reportSchema),
    onSuccess: () => {
      onOpenChange(false)
      toast.success(t('article.report_sent'))
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : t('article.report_failed')),
  })

  const confirm = () => {
    if (viewer.status === 'guest') {
      sessionEvents.emit('login_required')
      return
    }
    if (viewer.status !== 'member') return
    report.mutate()
  }

  return (
    <Dialog is_open={is_open} onOpenChange={onOpenChange}>
      <Dialog.Header>
        <Dialog.Heading>{t('article.report_title')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <p className="text-muted">{t('article.report_body')}</p>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="ghost" slot="close">
          {t('common.cancel')}
        </Button>
        <Button variant="primary" isDisabled={report.isPending} onPress={confirm}>
          {t('article.report')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export function useReportDialog(): { is_open: boolean; open: () => void; onOpenChange: (is_open: boolean) => void } {
  const [is_open, setOpen] = useState(false)
  return { is_open, open: () => setOpen(true), onOpenChange: setOpen }
}

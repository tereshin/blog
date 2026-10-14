import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'
import { useReportArticle } from '../model/useReportArticle.ts'

type ReportDialogProps = { article_id: string; is_open: boolean; onOpenChange: (is_open: boolean) => void }

/** Подтверждение жалобы. Пункт меню открывает это окно снаружи, чтобы не ломать список пунктов. */
export function ReportDialog({ article_id, is_open, onOpenChange }: ReportDialogProps) {
  const { t } = useT()
  const report = useReportArticle(article_id, () => onOpenChange(false))

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
        <Button variant="primary" isDisabled={report.is_pending} onPress={report.submit}>
          {t('article.report')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

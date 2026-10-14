import { useMutation } from '@tanstack/react-query'
import { useViewer } from '@/entities/session'
import { ApiError, sessionEvents } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
import { reportArticle } from '../api/report-article.ts'

/** Жалоба на статью: гость получает панель входа, участник — отправку и тост с результатом. */
export function useReportArticle(article_id: string, onSent: () => void): { is_pending: boolean; submit: () => void } {
  const { t } = useT()
  const toast = useToast()
  const { viewer } = useViewer()
  const report = useMutation({
    mutationFn: () => reportArticle(article_id),
    onSuccess: () => {
      onSent()
      toast.success(t('article.report_sent'))
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : t('article.report_failed')),
  })

  const submit = () => {
    if (viewer.status === 'guest') {
      sessionEvents.emit('login_required')
      return
    }
    if (viewer.status !== 'member') return
    report.mutate()
  }

  return { is_pending: report.isPending, submit }
}

import { useEffect } from 'react'
import { sessionEvents } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
import { useViewer } from '../model/useViewer.ts'

/** Полоса в центре, пока учётная запись ограничена. Отказ мутации показывает тот же текст. */
export function RestrictedNotice() {
  const { t } = useT()
  const toast = useToast()
  const { viewer } = useViewer()

  useEffect(() => sessionEvents.on('restricted', () => toast.error(t('error.restricted'))), [t, toast])

  if (viewer.status !== 'member' || !viewer.user.is_restricted) return null
  return (
    <p role="status" className="border-b border-separator bg-surface-secondary px-4 py-2 text-sm text-foreground">
      {t('error.restricted')}
    </p>
  )
}

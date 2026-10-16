import type { ReactNode } from 'react'
import { useViewer } from '@/entities/session'
import { useSettings } from '@/entities/settings'
import { useLoginDialogStore } from '@/features/login'
import { useT } from '@/shared/i18n'
import { Button, ErrorState, Skeleton } from '@/shared/ui'

/** Hide the entire application, including navigation and cached pages, during maintenance. */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { t } = useT()
  const settings = useSettings()
  const { is_admin, is_loading } = useViewer()
  const openLogin = useLoginDialogStore((state) => state.open)
  if (is_admin) return children
  if (settings.isPending || is_loading) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <Skeleton className="h-40" aria-label={t('common.loading')} />
      </main>
    )
  }
  if (settings.isError) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <ErrorState title={t('admin.settings.error')} onRetry={() => void settings.refetch()} />
        <Button onPress={() => openLogin()}>{t('maintenance.sign_in')}</Button>
      </main>
    )
  }
  if (!settings.data.maintenance_enabled) return children
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <h1 className="text-3xl font-semibold">{t('maintenance.title')}</h1>
      <p className="max-w-md text-muted">{t('maintenance.description')}</p>
      <Button variant="secondary" onPress={() => openLogin()}>
        {t('maintenance.sign_in')}
      </Button>
    </main>
  )
}

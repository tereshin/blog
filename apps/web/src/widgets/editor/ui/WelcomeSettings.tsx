import { lazy, Suspense, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { settingsKeys } from '@/entities/settings'
import type { WelcomeContent } from '@blog/contracts'
import { RequireRole, useViewer } from '@/entities/session'
import { getAdminSettings } from '@/features/update-settings'
import { useT } from '@/shared/i18n'
import { Button, ErrorState, PageCard, Skeleton } from '@/shared/ui'

const WelcomeEditor = lazy(() =>
  import('./WelcomeEditor.tsx').then((module) => ({ default: module.WelcomeEditor })),
)

export function WelcomeSettings() {
  const { t } = useT()
  const { is_superadmin } = useViewer()
  const [opened, setOpened] = useState<{ initial: WelcomeContent | null } | null>(null)
  const query = useQuery({
    enabled: is_superadmin,
    queryKey: settingsKeys.admin(),
    queryFn: ({ signal }) => getAdminSettings(signal),
  })
  return (
    <>
      <RequireRole role="superadmin">
        <PageCard>
          <PageCard.Header title={t('welcome.title')} />
          <PageCard.Content>
            {query.isPending ? (
              <Skeleton className="h-10" />
            ) : query.isError ? (
              <ErrorState title={t('admin.settings.error')} onRetry={() => void query.refetch()} />
            ) : (
              <Button onPress={() => setOpened({ initial: query.data.welcome_content ?? null })}>
                {t(query.data.welcome_content ? 'welcome.edit' : 'welcome.create')}
              </Button>
            )}
          </PageCard.Content>
        </PageCard>
      </RequireRole>
      {opened ? (
        <Suspense fallback={<Skeleton className="h-48" />}>
          <WelcomeEditor initial={opened.initial} onClose={() => setOpened(null)} />
        </Suspense>
      ) : null}
    </>
  )
}

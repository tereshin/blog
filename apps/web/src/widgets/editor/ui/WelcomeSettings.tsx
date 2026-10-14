import { lazy, Suspense, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { settingsKeys } from '@/entities/settings'
import type { WelcomeContent } from '@blog/contracts'
import { useViewer } from '@/entities/session'
import { getAdminSettings } from '@/features/update-settings'
import { useT } from '@/shared/i18n'
import { Button, ErrorState, PageCard, Skeleton } from '@/shared/ui'

const WelcomeEditor = lazy(() =>
  import('./WelcomeEditor.tsx').then((module) => ({ default: module.WelcomeEditor })),
)

/** Вторая секция страницы настроек: объяснение о доступе показывает каталог над ней. */
export function WelcomeSettings() {
  const { t } = useT()
  const { is_superadmin } = useViewer()
  const [opened, setOpened] = useState<{ initial: WelcomeContent | null } | null>(null)
  const query = useQuery({
    enabled: is_superadmin,
    queryKey: settingsKeys.admin(),
    queryFn: ({ signal }) => getAdminSettings(signal),
  })
  if (!is_superadmin) return null
  return (
    <>
      <PageCard>
        <PageCard.Header title={t('welcome.title')} heading_level={2} />
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
      {opened ? (
        <Suspense fallback={<Skeleton className="h-48" />}>
          <WelcomeEditor initial={opened.initial} onClose={() => setOpened(null)} />
        </Suspense>
      ) : null}
    </>
  )
}

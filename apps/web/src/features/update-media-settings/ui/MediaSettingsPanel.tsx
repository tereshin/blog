import { useQuery } from '@tanstack/react-query'
import { useT } from '@/shared/i18n'
import { ErrorState, PageCard, Skeleton } from '@/shared/ui'
import { getMediaSettings, MEDIA_SETTINGS_KEY } from '../api/media-settings.ts'
import { MediaSettingsForm } from './MediaSettingsForm.tsx'

export function MediaSettingsPanel() {
  const { t } = useT()
  const query = useQuery({
    queryKey: MEDIA_SETTINGS_KEY,
    queryFn: ({ signal }) => getMediaSettings(signal),
  })
  if (query.isPending || query.isError)
    return (
      <PageCard>
        <PageCard.Header title={t('media.settings.title')} />
        <PageCard.Content>
          {query.isPending ? (
            <Skeleton className="h-72" aria-label={t('common.loading')} />
          ) : (
            <ErrorState title={t('admin.settings.error')} onRetry={() => void query.refetch()} />
          )}
        </PageCard.Content>
      </PageCard>
    )
  return <MediaSettingsForm initial={query.data} />
}

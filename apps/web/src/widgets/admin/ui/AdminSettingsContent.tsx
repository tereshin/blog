import { useQuery } from '@tanstack/react-query'
import { settingsKeys } from '@/entities/settings'
import { SettingsForm, getAdminSettings } from '@/features/update-settings'
import type { SettingsSection } from '@/features/update-settings'
import { ImageUploadButton } from '@/features/upload-media'
import { useT } from '@/shared/i18n'
import { Card, ErrorState, Skeleton } from '@/shared/ui'

export function AdminSettingsContent({ section }: { section: SettingsSection }) {
  const { t } = useT()
  const settings = useQuery({
    queryKey: settingsKeys.admin(),
    queryFn: ({ signal }) => getAdminSettings(signal),
  })
  if (settings.isPending) return <Skeleton className="h-72" aria-label={t('common.loading')} />
  if (settings.isError)
    return <ErrorState title={t('admin.settings.error')} onRetry={() => void settings.refetch()} />
  return (
    <Card>
      <Card.Content>
        <SettingsForm
          key={section}
          section={section}
          initial={settings.data}
          upload={({ label, onUploaded }) => (
            <ImageUploadButton label={label} onUploaded={onUploaded} />
          )}
        />
      </Card.Content>
    </Card>
  )
}

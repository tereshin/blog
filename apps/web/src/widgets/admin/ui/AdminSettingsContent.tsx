import { ADMIN_ROUTES } from '@/entities/admin'
import { SettingsForm } from '@/features/update-settings'
import type { SettingsSection } from '@/features/update-settings'
import { ImageUploadButton, FaviconUploadButton } from '@/features/upload-media'
import { useT } from '@/shared/i18n'
import { ErrorState, PageCard, Skeleton } from '@/shared/ui'
import { useAdminSettings } from '../model/useAdminSettings.ts'

export function AdminSettingsContent({ section }: { section: SettingsSection }) {
  const { t } = useT()
  const settings = useAdminSettings()
  if (settings.isPending || settings.isError)
    return (
      <PageCard>
        <PageCard.Header title={t(ADMIN_ROUTES[section].title)} />
        <PageCard.Content>
          {settings.isPending ? (
            <Skeleton className="h-72" aria-label={t('common.loading')} />
          ) : (
            <ErrorState title={t('admin.settings.error')} onRetry={() => void settings.refetch()} />
          )}
        </PageCard.Content>
      </PageCard>
    )
  return (
    <SettingsForm
      key={section}
      section={section}
      initial={settings.data}
      upload={({ label, onUploaded, variant, children, isIconOnly, is_disabled }) =>
        variant ? (
          <FaviconUploadButton label={label} variant={variant} onUploaded={onUploaded} />
        ) : (
          <ImageUploadButton
            label={label}
            onUploaded={onUploaded}
            container_className="items-start"
            children={children}
            isIconOnly={isIconOnly}
            is_disabled={is_disabled}
          />
        )
      }
    />
  )
}

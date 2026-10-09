import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { settingsKeys } from '@/entities/settings'
import { RequireRole } from '@/entities/session'
import { MemberSearch } from '@/features/manage-members'
import { SettingsForm, getAdminSettings } from '@/features/update-settings'
import { ImageUploadButton } from '@/features/upload-media'
import { useT } from '@/shared/i18n'
import { ErrorState } from '@/shared/ui'
import { useShellStore } from '@/widgets/shell'

function SettingsScreen() {
  const { t } = useT()
  const settings = useQuery({ queryKey: settingsKeys.admin(), queryFn: ({ signal }) => getAdminSettings(signal) })
  if (settings.isPending) return <p className="text-sm text-muted">{t('common.loading')}</p>
  if (settings.isError || !settings.data) return <ErrorState title={t('admin.settings.error')} onRetry={() => void settings.refetch()} />
  return (
    <div className="flex flex-col gap-8 px-4 py-4">
      <SettingsForm
        initial={settings.data}
        upload={({ label, onUploaded }) => <ImageUploadButton label={label} onUploaded={onUploaded} />}
      />
      <MemberSearch />
    </div>
  )
}

export default function AdminSettingsPage() {
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const setArticleTopicId = useShellStore((state) => state.setArticleTopicId)

  useEffect(() => {
    setHeaderCenter({ kind: 'pill' })
    setArticleTopicId(null)
  }, [setHeaderCenter, setArticleTopicId])

  return (
    <RequireRole role="superadmin">
      <SettingsScreen />
    </RequireRole>
  )
}

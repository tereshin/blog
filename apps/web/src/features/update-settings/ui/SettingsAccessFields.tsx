import { useT } from '@/shared/i18n'
import { ToggleField } from '@/shared/ui'
import type { AdminSettings } from '../api/update-settings.ts'

type AccessSettings = Pick<
  AdminSettings,
  'maintenance_enabled' | 'registration_open' | 'new_members_can_publish'
>
type SettingsAccessFieldsProps = {
  value: AccessSettings
  onChange: (patch: Partial<AccessSettings>) => void
}

export function SettingsAccessFields({ value, onChange }: SettingsAccessFieldsProps) {
  const { t } = useT()
  return (
    <>
      <div>
        <ToggleField
          label={t('admin.settings.maintenance_enabled')}
          is_selected={value.maintenance_enabled ?? false}
          onChange={(maintenance_enabled) => onChange({ maintenance_enabled })}
        />
        <p className="text-sm text-muted">{t('admin.settings.maintenance_hint')}</p>
      </div>
      <ToggleField
        label={t('admin.settings.registration_open')}
        is_selected={value.registration_open}
        onChange={(registration_open) => onChange({ registration_open })}
      />
      <ToggleField
        label={t('admin.settings.new_members_can_publish')}
        is_selected={value.new_members_can_publish}
        onChange={(new_members_can_publish) => onChange({ new_members_can_publish })}
      />
    </>
  )
}

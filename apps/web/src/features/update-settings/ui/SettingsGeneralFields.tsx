import type { FaviconVariant } from '@blog/contracts'
import { SettingsLogoFields } from './SettingsLogoFields.tsx'
import { SettingsFaviconFields } from './SettingsFaviconFields.tsx'
import type { ReactNode } from 'react'
import type { AdminSettings } from '../api/update-settings.ts'
import { useT } from '@/shared/i18n'
import { FormTextField, SelectField } from '@/shared/ui'

type GeneralSettings = Pick<
  AdminSettings,
  'meta_pixel_id' | 'name' | 'logo_url' | 'logo_dark_url' | 'favicon' | 'locale'
>
type SettingsGeneralFieldsProps = {
  value: GeneralSettings
  onChange: (value: GeneralSettings) => void
  can_edit_media: boolean
  upload: (options: {
    label: string
    variant?: FaviconVariant
    onUploaded: (url: string) => void
  }) => ReactNode
}
export function SettingsGeneralFields({
  value,
  onChange,
  can_edit_media,
  upload,
}: SettingsGeneralFieldsProps) {
  const { t } = useT()
  return (
    <>
      <FormTextField
        label={t('admin.settings.name')}
        required
        maxLength={100}
        value={value.name}
        hint={t('admin.settings.name_hint')}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
      />
      <FormTextField
        label={t('admin.settings.meta_pixel_id')}
        value={value.meta_pixel_id ?? ''}
        inputMode="numeric"
        pattern="[0-9]{5,25}"
        maxLength={25}
        placeholder="1661355165525767"
        hint={t('admin.settings.meta_pixel_hint')}
        onChange={(event) => onChange({ ...value, meta_pixel_id: event.target.value.trim() || null })}
      />
      <SettingsLogoFields
        value={value}
        onChange={(patch) => onChange({ ...value, ...patch })}
        can_edit_media={can_edit_media}
        upload={upload}
      />
      <SettingsFaviconFields
        value={value.favicon}
        onChange={(favicon) => onChange({ ...value, favicon })}
        can_edit_media={can_edit_media}
        upload={upload}
      />
      <SelectField
        label={t('admin.settings.locale')}
        value={value.locale}
        options={(['ru', 'en', 'sr'] as const).map((locale) => ({
          value: locale,
          label: t(`locale.${locale}`),
        }))}
        onChange={(locale) => {
          if (locale === 'ru' || locale === 'en' || locale === 'sr') onChange({ ...value, locale })
        }}
      />
    </>
  )
}

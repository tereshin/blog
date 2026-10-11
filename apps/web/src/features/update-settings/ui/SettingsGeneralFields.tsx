import type { ReactNode } from 'react'
import type { AdminSettings } from '../api/update-settings.ts'
import { useT } from '@/shared/i18n'
import { Button, Input, SelectField, TextArea } from '@/shared/ui'

type GeneralSettings = Pick<AdminSettings, 'name' | 'logo_url' | 'locale' | 'about'>
type SettingsGeneralFieldsProps = {
  value: GeneralSettings
  onChange: (value: GeneralSettings) => void
  can_edit_media: boolean
  upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
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
      <label className="flex flex-col gap-1 text-sm">
        {t('admin.settings.name')}
        <Input
          required
          maxLength={100}
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </label>
      {can_edit_media ? (
        upload({
          label: t('admin.settings.logo'),
          onUploaded: (logo_url) => onChange({ ...value, logo_url }),
        })
      ) : (
        <Button type="button" isDisabled>
          {t('admin.settings.logo')}
        </Button>
      )}
      {value.logo_url ? (
        <div className="flex items-center gap-3">
          <img src={value.logo_url} alt="" className="h-10 max-w-48 object-contain" />
          <Button
            type="button"
            variant="ghost"
            isDisabled={!can_edit_media}
            onPress={() => onChange({ ...value, logo_url: null })}
          >
            {t('common.delete')}
          </Button>
        </div>
      ) : null}
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
      <label className="flex flex-col gap-1 text-sm">
        {t('admin.settings.about')}
        <TextArea
          value={value.about}
          onChange={(event) => onChange({ ...value, about: event.target.value })}
          className="min-h-32"
        />
      </label>
    </>
  )
}

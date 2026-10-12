import type { ReactNode } from 'react'
import type { AdminSettings } from '../api/update-settings.ts'
import { useT } from '@/shared/i18n'
import { Button, FormTextField, FormTextArea, SelectField } from '@/shared/ui'

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
      <FormTextField
        label={t('admin.settings.name')}
        required
        maxLength={100}
        value={value.name}
        hint={t('admin.settings.name_hint')}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
      />
      <FormTextArea
        label={t('admin.settings.about')}
        value={value.about}
        hint={t('admin.settings.about_hint')}
        onChange={(event) => onChange({ ...value, about: event.target.value })}
      />
      <fieldset className="flex min-w-0 max-w-lg flex-col gap-4 border-0 p-0">
        <legend className="mb-3 text-base font-semibold">{t('admin.settings.logo')}</legend>
        <div className="flex flex-wrap items-center gap-4">
          {value.logo_url ? (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border border-separator bg-surface-secondary p-3">
              <img
                src={value.logo_url}
                alt={t('admin.settings.logo')}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {can_edit_media ? (
              upload({
                label: t(
                  value.logo_url ? 'admin.settings.replace_logo' : 'admin.settings.upload_logo',
                ),
                onUploaded: (logo_url) => onChange({ ...value, logo_url }),
              })
            ) : (
              <Button type="button" isDisabled>
                {t('admin.settings.upload_logo')}
              </Button>
            )}
            {value.logo_url ? (
              <Button
                type="button"
                variant="ghost"
                isDisabled={!can_edit_media}
                onPress={() => onChange({ ...value, logo_url: null })}
              >
                {t('common.delete')}
              </Button>
            ) : null}
          </div>
        </div>
      </fieldset>
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

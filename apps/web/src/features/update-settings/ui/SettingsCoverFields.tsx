import { ColorPickerField } from '@/shared/ui/ColorPickerField'
import type { ReactNode } from 'react'
import type { SocialCoverSettings } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button, SelectField } from '@/shared/ui'

export function SettingsCoverFields({
  value,
  onChange,
  upload,
  can_edit_media,
}: {
  value: SocialCoverSettings
  onChange: (value: SocialCoverSettings) => void
  upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
  can_edit_media: boolean
}) {
  const { t } = useT()
  return (
    <fieldset className="flex flex-col gap-8 border-0 p-0">
      <legend className="sr-only">{t('seo.covers')}</legend>
      <p className="text-xs text-muted">{t('seo.covers_hint')}</p>
      <SelectField
        label={t('seo.background')}
        value={value.background_mode}
        options={[
          { value: 'image', label: t('seo.background_image') },
          { value: 'color', label: t('seo.background_color') },
        ]}
        onChange={(mode) =>
          onChange({ ...value, background_mode: mode === 'color' ? 'color' : 'image' })
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {(['background_color', 'text_color'] as const).map((field) => (
          <ColorPickerField
            key={field}
            label={t(field === 'background_color' ? 'seo.fill_color' : 'seo.text_color')}
            value={value[field]}
            onChange={(color) => onChange({ ...value, [field]: color })}
          />
        ))}
      </div>
      {can_edit_media
        ? upload({
            label: t('seo.cover_logo'),
            onUploaded: (logo_url) => onChange({ ...value, logo_url }),
          })
        : null}
      {value.logo_url ? (
        <div className="flex items-center gap-3">
          <img src={value.logo_url} alt="" className="h-12 max-w-40 object-contain" />
          <Button
            type="button"
            variant="ghost"
            isDisabled={!can_edit_media}
            onPress={() => onChange({ ...value, logo_url: null })}
          >
            {t('seo.inherit_logo')}
          </Button>
        </div>
      ) : null}
      {can_edit_media
        ? upload({
            label: t('seo.default_cover'),
            onUploaded: (default_image_url) => onChange({ ...value, default_image_url }),
          })
        : null}
      {value.default_image_url ? (
        <div className="flex flex-col items-start gap-2">
          <img src={value.default_image_url} alt="" className="w-full max-w-80 rounded-lg" />
          <Button
            type="button"
            variant="ghost"
            isDisabled={!can_edit_media}
            onPress={() => onChange({ ...value, default_image_url: null })}
          >
            {t('seo.automatic_cover')}
          </Button>
        </div>
      ) : null}
    </fieldset>
  )
}

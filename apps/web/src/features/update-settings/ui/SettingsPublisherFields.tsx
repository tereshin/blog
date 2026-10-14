import { FormTextField, FormTextArea } from '@/shared/ui'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { SeoSettings } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'

export function SettingsPublisherFields({
  value,
  onChange,
  upload,
  can_edit_media,
}: {
  value: SeoSettings['publisher']
  onChange: (value: SeoSettings['publisher']) => void
  upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
  can_edit_media: boolean
}) {
  const { t } = useT()
  const [links, setLinks] = useState(() => value.same_as.join('\n'))
  return (
    <fieldset aria-label={t('seo.publisher')} className="flex min-w-0 flex-col gap-8 border-0 p-0">
      <p className="text-xs text-muted">{t('seo.publisher_hint')}</p>
      <FormTextField
        label={t('seo.publisher_name')}
        maxLength={100}
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
      />
      {can_edit_media
        ? upload({
            label: t('seo.publisher_logo'),
            onUploaded: (logo_url) => onChange({ ...value, logo_url }),
          })
        : null}
      {value.logo_url ? (
        <div className="flex items-center gap-3">
          <img loading="lazy" src={value.logo_url} alt="" className="h-12 max-w-40 object-contain" />
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
      <FormTextArea
        label={t('seo.same_as')}
        hint={t('seo.same_as_hint')}
        value={links}
        onChange={(event) => {
          setLinks(event.target.value)
          onChange({
            ...value,
            same_as: event.target.value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
          })
        }}
      />
    </fieldset>
  )
}

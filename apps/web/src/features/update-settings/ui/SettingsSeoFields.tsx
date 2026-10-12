import { FormTextField, FormTextArea } from '@/shared/ui'
import type { SeoSettings } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { ToggleField } from '@/shared/ui'

export function SettingsSeoFields({
  value,
  public_origin,
  onChange,
}: {
  value: SeoSettings
  public_origin?: string
  onChange: (value: SeoSettings) => void
}) {
  const { t } = useT()
  return (
    <>
      <fieldset aria-label={t('seo.settings')} className="flex min-w-0 flex-col gap-8 border-0 p-0">
        <FormTextField label={t('seo.public_origin')} readOnly value={public_origin ?? ''} />
        <FormTextField
          label={t('seo.title')}
          maxLength={200}
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
        />
        <FormTextArea
          label={t('seo.description')}
          maxLength={500}
          value={value.description}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
        />
        <FormTextField
          label={t('seo.template')}
          hint={t('seo.template_hint')}
          required
          maxLength={250}
          value={value.title_template}
          onChange={(event) => onChange({ ...value, title_template: event.target.value })}
        />

        <ToggleField
          label={t('seo.indexing')}
          isSelected={value.indexing_enabled}
          onChange={(indexing_enabled) => onChange({ ...value, indexing_enabled })}
        />
        <p className="text-xs text-muted">{t('seo.indexing_hint')}</p>
        {(['home', 'popular', 'rating', 'about'] as const).map((key) => (
          <fieldset
            key={key}
            className="flex min-w-0 max-w-lg flex-col gap-6 border-t border-separator pt-6"
          >
            <legend className="text-sm font-medium">{t(`seo.page.${key}`)}</legend>
            <FormTextField
              label={t('seo.title')}
              maxLength={200}
              value={value.pages[key].title}
              onChange={(event) =>
                onChange({
                  ...value,
                  pages: {
                    ...value.pages,
                    [key]: { ...value.pages[key], title: event.target.value },
                  },
                })
              }
            />
            <FormTextArea
              label={t('seo.description')}
              maxLength={500}
              value={value.pages[key].description}
              onChange={(event) =>
                onChange({
                  ...value,
                  pages: {
                    ...value.pages,
                    [key]: { ...value.pages[key], description: event.target.value },
                  },
                })
              }
            />
          </fieldset>
        ))}
      </fieldset>
    </>
  )
}

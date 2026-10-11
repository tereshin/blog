import { Input, TextArea } from '@/shared/ui'
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
      <fieldset className="flex flex-col gap-3 border-t border-separator pt-4">
        <legend className="text-lg font-semibold">{t('seo.settings')}</legend>
        <label className="flex flex-col gap-1 text-sm">
          {t('seo.public_origin')}
          <Input readOnly value={public_origin ?? ''} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('seo.title')}
          <Input
            maxLength={200}
            value={value.title}
            onChange={(event) => onChange({ ...value, title: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('seo.description')}
          <TextArea
            maxLength={500}
            value={value.description}
            onChange={(event) => onChange({ ...value, description: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('seo.template')}
          <Input
            required
            maxLength={250}
            value={value.title_template}
            onChange={(event) => onChange({ ...value, title_template: event.target.value })}
          />
          <span className="text-xs text-muted">{t('seo.template_hint')}</span>
        </label>
        <ToggleField
          label={t('seo.indexing')}
          isSelected={value.indexing_enabled}
          onChange={(indexing_enabled) => onChange({ ...value, indexing_enabled })}
        />
        <p className="text-xs text-muted">{t('seo.indexing_hint')}</p>
        {(['home', 'popular', 'rating', 'about'] as const).map((key) => (
          <fieldset
            key={key}
            className="flex flex-col gap-2 rounded-lg border border-separator p-3"
          >
            <legend className="text-sm font-medium">{t(`seo.page.${key}`)}</legend>
            <label className="flex flex-col gap-1 text-sm">
              {t('seo.title')}
              <Input
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
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t('seo.description')}
              <TextArea
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
            </label>
          </fieldset>
        ))}
      </fieldset>
    </>
  )
}

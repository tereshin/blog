import type { ImageCompression } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { FormTextField, SelectField, ToggleField } from '@/shared/ui'

type CompressionFieldsProps = {
  value: ImageCompression
  onChange: (value: ImageCompression) => void
}

export function CompressionFields({ value, onChange }: CompressionFieldsProps) {
  const { t } = useT()
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">{t('media.settings.compression')}</h2>
      <ToggleField
        label={t('media.settings.compress')}
        is_selected={value.enabled}
        onChange={(enabled) => onChange({ ...value, enabled })}
      />
      <p className="text-sm text-muted">{t('media.settings.compression_hint')}</p>
      <fieldset disabled={!value.enabled} className="flex min-w-0 flex-col gap-6 border-0 p-0">
        <SelectField
          label={t('media.settings.format')}
          value={value.format}
          options={[
            { value: 'webp', label: 'WebP' },
            { value: 'original', label: t('media.settings.original') },
          ]}
          onChange={(format) => {
            if (format === 'webp' || format === 'original') onChange({ ...value, format })
          }}
        />
        <FormTextField
          label={t('media.settings.quality')}
          hint={t('media.settings.quality_hint')}
          type="number"
          min={1}
          max={100}
          step={1}
          required
          value={value.quality || ''}
          onChange={(event) => onChange({ ...value, quality: Number(event.target.value) })}
        />
        <FormTextField
          label={t('media.settings.max_dimension')}
          hint={t('media.settings.dimension_hint')}
          type="number"
          min={64}
          max={8192}
          step={1}
          required
          value={value.max_dimension || ''}
          onChange={(event) => onChange({ ...value, max_dimension: Number(event.target.value) })}
        />
      </fieldset>
    </section>
  )
}

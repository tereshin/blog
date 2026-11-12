import { ArticlePicker } from './ArticlePicker.tsx'
import type { CommentsWidget } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { FormTextField, Select } from '@/shared/ui'
export function CommentsSettings({
  data,
  onChange,
  errors = {},
}: {
  data: CommentsWidget
  onChange: (data: CommentsWidget) => void
  errors?: Record<string, string>
}) {
  const { t } = useT()
  return (
    <div className="grid gap-4">
      <FormTextField
        label={t('widgets.count')}
        type="number"
        min={1}
        max={50}
        value={data.limit}
        error={errors.limit}
        onChange={(event) => onChange({ ...data, limit: Number(event.target.value) })}
      />
      <Select
        label={t('widgets.sort')}
        value={data.sort}
        options={(['date', 'reactions'] as const).map((value) => ({
          value,
          label: t(`widgets.${value}`),
        }))}
        onChange={(sort) => onChange({ ...data, sort: sort === 'date' ? sort : 'reactions' })}
      />
      <Select
        label={t('widgets.direction')}
        value={data.direction}
        options={(['desc', 'asc'] as const).map((value) => ({
          value,
          label: t(`widgets.${value}`),
        }))}
        onChange={(direction) =>
          onChange({ ...data, direction: direction === 'asc' ? direction : 'desc' })
        }
      />
      <Select
        label={t('widgets.period')}
        value={data.period}
        options={(['all', 'day', 'week', 'month'] as const).map((value) => ({
          value,
          label: t(`widgets.${value}`),
        }))}
        onChange={(period) => {
          if (period === 'all' || period === 'day' || period === 'week' || period === 'month')
            onChange({ ...data, period })
        }}
      />
      <ArticlePicker
        value={data.article_id}
        onChange={(article_id) => onChange({ ...data, article_id })}
      />
    </div>
  )
}

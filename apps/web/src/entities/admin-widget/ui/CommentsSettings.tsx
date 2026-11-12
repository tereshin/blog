import { ArticlePicker } from './ArticlePicker.tsx'
import type { CommentsWidget } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { WidgetField, WIDGET_INPUT_CLASS } from './WidgetField.tsx'
export function CommentsSettings({
  data,
  onChange,
}: {
  data: CommentsWidget
  onChange: (data: CommentsWidget) => void
}) {
  const { t } = useT()
  return (
    <div className="grid gap-3">
      <WidgetField label={t('widgets.count')}>
        <input
          className={WIDGET_INPUT_CLASS}
          type="number"
          min={1}
          max={50}
          value={data.limit}
          onChange={(event) => onChange({ ...data, limit: Number(event.target.value) })}
        />
      </WidgetField>
      <WidgetField label={t('widgets.sort')}>
        <select
          className={WIDGET_INPUT_CLASS}
          value={data.sort}
          onChange={(event) =>
            onChange({ ...data, sort: event.target.value === 'date' ? 'date' : 'reactions' })
          }
        >
          <option value="date">{t('widgets.date')}</option>
          <option value="reactions">{t('widgets.reactions')}</option>
        </select>
      </WidgetField>
      <WidgetField label={t('widgets.direction')}>
        <select
          className={WIDGET_INPUT_CLASS}
          value={data.direction}
          onChange={(event) =>
            onChange({ ...data, direction: event.target.value === 'asc' ? 'asc' : 'desc' })
          }
        >
          <option value="desc">{t('widgets.desc')}</option>
          <option value="asc">{t('widgets.asc')}</option>
        </select>
      </WidgetField>
      <WidgetField label={t('widgets.period')}>
        <select
          className={WIDGET_INPUT_CLASS}
          value={data.period}
          onChange={(event) => {
            const period = event.target.value
            if (period === 'all' || period === 'day' || period === 'week' || period === 'month')
              onChange({ ...data, period })
          }}
        >
          {(['all', 'day', 'week', 'month'] as const).map((period) => (
            <option key={period} value={period}>
              {t(`widgets.${period}`)}
            </option>
          ))}
        </select>
      </WidgetField>
      <ArticlePicker
        value={data.article_id}
        onChange={(article_id) => onChange({ ...data, article_id })}
      />
    </div>
  )
}

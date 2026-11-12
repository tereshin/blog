import type { AdminWidget } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { moveItem } from '../model/default-widget.ts'
import { WidgetField, WIDGET_INPUT_CLASS } from './WidgetField.tsx'
type Data = Extract<AdminWidget, { type: 'adminFeedback' }>['data']
export function FeedbackSettings({
  data,
  onChange,
}: {
  data: Data
  onChange: (data: Data) => void
}) {
  const { t } = useT()
  return (
    <div className="flex flex-col gap-3">
      <WidgetField label={t('widgets.recipient')}>
        <input
          type="email"
          className={WIDGET_INPUT_CLASS}
          value={data.recipient}
          onChange={(event) => onChange({ ...data, recipient: event.target.value })}
        />
      </WidgetField>
      {data.fields.map((field, index) => (
        <fieldset key={field.name} className="rounded-lg border border-separator p-2">
          <legend className="text-sm">{field.name}</legend>
          <WidgetField label={t('widgets.label')}>
            <input
              className={WIDGET_INPUT_CLASS}
              value={field.label}
              onChange={(event) =>
                onChange({
                  ...data,
                  fields: data.fields.map((item) =>
                    item.name === field.name ? { ...item, label: event.target.value } : item,
                  ),
                })
              }
            />
          </WidgetField>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <label>
              <input
                type="checkbox"
                checked={field.is_visible}
                onChange={(event) =>
                  onChange({
                    ...data,
                    fields: data.fields.map((item) =>
                      item.name === field.name
                        ? { ...item, is_visible: event.target.checked }
                        : item,
                    ),
                  })
                }
              />{' '}
              {t('widgets.visible')}
            </label>
            <label>
              <input
                type="checkbox"
                checked={field.is_required}
                onChange={(event) =>
                  onChange({
                    ...data,
                    fields: data.fields.map((item) =>
                      item.name === field.name
                        ? { ...item, is_required: event.target.checked }
                        : item,
                    ),
                  })
                }
              />{' '}
              {t('widgets.required')}
            </label>
            <button
              type="button"
              disabled={index === 0}
              aria-label={t('widgets.up')}
              onClick={() => onChange({ ...data, fields: moveItem(data.fields, index, -1) })}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={index === data.fields.length - 1}
              aria-label={t('widgets.down')}
              onClick={() => onChange({ ...data, fields: moveItem(data.fields, index, 1) })}
            >
              ↓
            </button>
          </div>
        </fieldset>
      ))}
    </div>
  )
}

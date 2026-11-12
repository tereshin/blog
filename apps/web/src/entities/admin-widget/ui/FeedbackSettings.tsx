import { Checkbox, Label } from '@heroui/react'
import type { AdminWidget } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button, FormTextField } from '@/shared/ui'
import { moveItem } from '../model/default-widget.ts'
type Data = Extract<AdminWidget, { type: 'adminFeedback' }>['data']
export function FeedbackSettings({
  data,
  onChange,
  errors = {},
}: {
  data: Data
  onChange: (data: Data) => void
  errors?: Record<string, string>
}) {
  const { t } = useT()
  return (
    <div className="grid gap-4">
      <FormTextField
        label={t('widgets.recipient')}
        type="email"
        value={data.recipient}
        error={errors.recipient}
        onChange={(event) => onChange({ ...data, recipient: event.target.value })}
      />
      {data.fields.map((field, index) => (
        <div key={field.name} className="grid gap-3 rounded-xl border border-separator p-3">
          <FormTextField
            label={field.name}
            value={field.label}
            error={errors[`fields.${index}.label`]}
            onChange={(event) =>
              onChange({
                ...data,
                fields: data.fields.map((item) =>
                  item.name === field.name ? { ...item, label: event.target.value } : item,
                ),
              })
            }
          />
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              isSelected={field.is_visible}
              onChange={(is_visible) =>
                onChange({
                  ...data,
                  fields: data.fields.map((item) =>
                    item.name === field.name ? { ...item, is_visible } : item,
                  ),
                })
              }
            >
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label>{t('widgets.visible')}</Label>
            </Checkbox>
            <Checkbox
              isSelected={field.is_required}
              onChange={(is_required) =>
                onChange({
                  ...data,
                  fields: data.fields.map((item) =>
                    item.name === field.name ? { ...item, is_required } : item,
                  ),
                })
              }
            >
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label>{t('widgets.required')}</Label>
            </Checkbox>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              isDisabled={index === 0}
              onPress={() => onChange({ ...data, fields: moveItem(data.fields, index, -1) })}
            >
              {t('widgets.up')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              isDisabled={index === data.fields.length - 1}
              onPress={() => onChange({ ...data, fields: moveItem(data.fields, index, 1) })}
            >
              {t('widgets.down')}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

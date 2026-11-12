import type { AdminWidget } from '@blog/contracts'
import { CommentsSettings } from './CommentsSettings.tsx'
import { FeedbackSettings } from './FeedbackSettings.tsx'
import { ButtonsSettings } from './ButtonsSettings.tsx'
export function WidgetSettings({
  widget,
  onChange,
  errors = {},
}: {
  widget: AdminWidget
  onChange: (widget: AdminWidget) => void
  errors?: Record<string, string>
}) {
  switch (widget.type) {
    case 'adminComments':
      return (
        <CommentsSettings
          data={widget.data}
          errors={errors}
          onChange={(data) => onChange({ ...widget, data })}
        />
      )
    case 'adminFeedback':
      return (
        <FeedbackSettings
          data={widget.data}
          errors={errors}
          onChange={(data) => onChange({ ...widget, data })}
        />
      )
    case 'adminButtons':
      return (
        <ButtonsSettings
          data={widget.data}
          errors={errors}
          onChange={(data) => onChange({ ...widget, data })}
        />
      )
  }
}

import type { PublicWidget } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { useFeedbackForm } from '../model/useFeedbackForm.ts'
type Widget = Extract<PublicWidget, { type: 'adminFeedback' }>
export function FeedbackWidgetView({
  widget,
  page_id,
  is_preview = false,
}: {
  widget: Widget
  page_id?: string
  is_preview?: boolean
}) {
  const { t } = useT()
  const form = useFeedbackForm(widget, page_id)
  if (form.status === 'sent') return <p role="status">{t('widgets.sent')}</p>
  const input_class =
    'w-full min-w-0 rounded-lg border border-separator bg-surface px-3 py-2 text-sm'
  return (
    <form
      className="flex min-w-0 flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!is_preview) void form.send()
      }}
    >
      <fieldset
        disabled={form.status === 'pending' || is_preview}
        className="flex min-w-0 flex-col gap-3"
      >
        {widget.data.fields
          .filter((field) => field.is_visible)
          .map((field) => (
            <label key={field.name} className="flex min-w-0 flex-col gap-1 text-sm">
              <span>
                {field.label}
                {field.is_required ? ' *' : ''}
              </span>
              {field.name === 'attachments' ? (
                <>
                  <input
                    className={input_class}
                    type="file"
                    multiple
                    required={field.is_required}
                    accept=".pdf,.rtf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv,.md"
                    onChange={(event) => form.setFiles(Array.from(event.target.files ?? []))}
                  />
                  <span className="text-xs text-muted">{t('widgets.files_limit')}</span>
                </>
              ) : field.name === 'message' ? (
                <textarea
                  className={input_class}
                  rows={4}
                  maxLength={10000}
                  required={field.is_required}
                  value={form.values[field.name] ?? ''}
                  onChange={(event) =>
                    form.setValues({ ...form.values, [field.name]: event.target.value })
                  }
                />
              ) : (
                <input
                  className={input_class}
                  type={field.name === 'email' ? 'email' : field.name === 'phone' ? 'tel' : 'text'}
                  autoComplete={field.name === 'phone' ? 'tel' : field.name}
                  maxLength={254}
                  required={field.is_required}
                  value={form.values[field.name] ?? ''}
                  onChange={(event) =>
                    form.setValues({ ...form.values, [field.name]: event.target.value })
                  }
                />
              )}
            </label>
          ))}
        <label className="hidden" aria-hidden="true">
          {t('widgets.website')}
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(event) => form.setWebsite(event.target.value)}
          />
        </label>
        <Button type="submit" isDisabled={is_preview || form.status === 'pending'}>
          {form.status === 'pending' ? t('common.loading') : t('widgets.send')}
        </Button>
      </fieldset>
      {form.status === 'error' ? (
        <p role="alert" className="text-sm text-danger">
          {t('widgets.send_error')}
        </p>
      ) : null}
    </form>
  )
}

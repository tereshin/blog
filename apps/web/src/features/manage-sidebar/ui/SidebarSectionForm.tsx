import type { Sidebar } from '@blog/contracts'
import { defaultWidget, moveItem, WidgetSettings } from '@/entities/admin-widget'
import { useT } from '@/shared/i18n'
type Section = Sidebar['sections'][number]
export function SidebarSectionForm({
  section,
  onChange,
}: {
  section: Section
  onChange: (section: Section) => void
}) {
  const { t } = useT()
  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm">
        {t('widgets.title')}
        <input
          className="rounded-lg border border-separator bg-surface px-3 py-2"
          maxLength={80}
          value={section.title}
          onChange={(event) => onChange({ ...section, title: event.target.value })}
        />
      </label>
      <label className="text-sm">
        <input
          type="checkbox"
          checked={section.has_card}
          onChange={(event) => onChange({ ...section, has_card: event.target.checked })}
        />{' '}
        {t('widgets.card')}
      </label>
      {section.widgets.map((widget, index) => (
        <fieldset key={widget.id} className="grid gap-3 rounded-lg border border-separator p-3">
          <legend>{t(`widgets.${widget.type}`)}</legend>
          <WidgetSettings
            widget={widget}
            onChange={(updated) =>
              onChange({
                ...section,
                widgets: section.widgets.map((item) => (item.id === updated.id ? updated : item)),
              })
            }
          />
          <div className="flex gap-4 text-sm">
            <button
              type="button"
              disabled={index === 0}
              aria-label={t('widgets.up')}
              onClick={() =>
                onChange({ ...section, widgets: moveItem(section.widgets, index, -1) })
              }
            >
              ↑
            </button>
            <button
              type="button"
              disabled={index === section.widgets.length - 1}
              aria-label={t('widgets.down')}
              onClick={() => onChange({ ...section, widgets: moveItem(section.widgets, index, 1) })}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...section,
                  widgets: section.widgets.filter((item) => item.id !== widget.id),
                })
              }
            >
              {t('widgets.remove')}
            </button>
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-3">
        {(['adminComments', 'adminFeedback', 'adminButtons'] as const).map((type) => (
          <button
            type="button"
            key={type}
            disabled={section.widgets.length >= 20}
            className="text-sm"
            onClick={() =>
              onChange({ ...section, widgets: [...section.widgets, defaultWidget(type)] })
            }
          >
            + {t(`widgets.${type}`)}
          </button>
        ))}
      </div>
    </div>
  )
}

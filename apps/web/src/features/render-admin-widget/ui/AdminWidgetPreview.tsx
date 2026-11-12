import type { AdminWidget, PublicWidget } from '@blog/contracts'
import { adminWidgetSchema } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { AdminWidgetView } from './AdminWidgetView.tsx'

function project(widget: AdminWidget): PublicWidget {
  if (widget.type === 'adminFeedback') return { ...widget, data: { fields: widget.data.fields } }
  if (widget.type === 'adminButtons')
    return {
      ...widget,
      data: {
        ...widget.data,
        items: widget.data.items.map((item) => ({
          id: item.id,
          title: item.title,
          icon: item.icon,
          href: item.target.kind === 'url' ? item.target.url : '#',
          is_external: item.target.kind === 'url',
        })),
      },
    }
  return widget
}

export function AdminWidgetPreview({ widget }: { widget: AdminWidget }) {
  const { t } = useT()
  const parsed = adminWidgetSchema.safeParse(widget)
  return parsed.success ? (
    <AdminWidgetView widget={project(parsed.data)} is_preview />
  ) : (
    <p className="text-sm text-muted">{t('widgets.invalid')}</p>
  )
}

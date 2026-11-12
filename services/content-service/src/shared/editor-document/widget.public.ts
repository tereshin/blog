import type { AdminWidget, PublicWidget } from '@blog/contracts'
export function publicWidget(
  widget: AdminWidget,
  page_hrefs: ReadonlyMap<string, string>,
): PublicWidget {
  if (widget.type === 'adminFeedback') return { ...widget, data: { fields: widget.data.fields } }
  if (widget.type !== 'adminButtons') return widget
  const items = widget.data.items.flatMap((item) => {
    const href = item.target.kind === 'url' ? item.target.url : page_hrefs.get(item.target.page_id)
    return href
      ? [
          {
            id: item.id,
            title: item.title,
            icon: item.icon,
            href,
            is_external: item.target.kind === 'url',
          },
        ]
      : []
  })
  return {
    ...widget,
    data: {
      title: widget.data.title,
      is_expanded: widget.data.is_expanded,
      items,
    },
  }
}

export function linkedPageIds(widgets: readonly AdminWidget[]) {
  return [
    ...new Set(
      widgets.flatMap((widget) =>
        widget.type === 'adminButtons'
          ? widget.data.items.flatMap((item) =>
              item.target.kind === 'page' ? [item.target.page_id] : [],
            )
          : [],
      ),
    ),
  ]
}

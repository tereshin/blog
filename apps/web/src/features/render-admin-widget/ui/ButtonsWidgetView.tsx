import { useId, useState } from 'react'
import type { PublicWidget } from '@blog/contracts'
import { NavItemIcon } from '@/entities/nav-section'
import { BaseIcon } from '@/shared/ui'
type Data = Extract<PublicWidget, { type: 'adminButtons' }>['data']
export function ButtonsWidgetView({
  data,
  is_preview,
}: {
  data: Data
  is_preview?: boolean | undefined
}) {
  const [is_expanded, setExpanded] = useState(data.is_expanded)
  const list_id = useId()
  return (
    <section className="flex min-w-0 flex-col gap-1 pt-3" aria-label={data.title}>
      <button
        type="button"
        className="group flex items-center gap-1 rounded-lg px-3 py-1 text-left text-base text-muted hover:text-foreground"
        aria-controls={list_id}
        aria-expanded={is_expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="min-w-0 flex-1 truncate">{data.title}</span>
        {is_expanded ? (
          <BaseIcon name="down" style="line" size={16} />
        ) : (
          <BaseIcon name="right" style="line" size={16} />
        )}
      </button>
      <div id={list_id} hidden={!is_expanded}>
        {data.items.map((item) => (
          <a
            key={item.id}
            href={is_preview ? undefined : item.href}
            {...(item.is_external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-md text-muted hover:bg-surface-secondary"
          >
            {item.icon ? <NavItemIcon svg={item.icon} size={24} /> : null}
            <span className="min-w-0 truncate">{item.title}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

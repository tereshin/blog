import { NavLink } from 'react-router'
import { cn } from '@/shared/lib'
import { topicHue } from '../model/topic-color.ts'
import type { Topic } from '../api/topic-schema.ts'

type TopicNavItemProps = {
  topic: Pick<Topic, 'id' | 'title' | 'slug'>
  /** Выбранная тема подсвечивается подложкой (логика — в `getHighlightedItem`). */
  is_selected?: boolean
}

/** Пункт темы в левой карточке: круглый цветной значок (цвет из хеша id) и название. */
export function TopicNavItem({ topic, is_selected = false }: TopicNavItemProps) {
  return (
    <NavLink
      to={`/t/${topic.slug}`}
      aria-current={is_selected ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-pill px-3 py-2 text-sm text-foreground outline-offset-2 hover:bg-surface-secondary',
        is_selected && 'bg-surface-tertiary font-medium',
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-avatar text-xs font-semibold text-white"
        style={{ backgroundColor: `oklch(58% 0.14 ${topicHue(topic.id)})` }}
      >
        {topic.title.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 truncate">{topic.title}</span>
    </NavLink>
  )
}

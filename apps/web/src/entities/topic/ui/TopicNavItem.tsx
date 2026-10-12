import { Link } from 'react-router'
import { cn } from '@/shared/lib'
import { Avatar } from '@/shared/ui'
import type { Topic } from '../api/topic-schema.ts'

type TopicNavItemProps = {
  topic: Pick<Topic, 'id' | 'title' | 'slug' | 'avatar_url'>
  /** Выбранная тема подсвечивается подложкой (логика — в `getHighlightedItem`). */
  is_selected?: boolean
}

/** Пункт темы в левой карточке: аватар темы и название. Без картинки остаются инициалы. */
export function TopicNavItem({ topic, is_selected = false }: TopicNavItemProps) {
  return (
    <Link
      to={`/t/${topic.slug}`}
      aria-current={is_selected ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-2 text-md text-foreground outline-offset-2 hover:bg-surface-secondary',
        is_selected && 'bg-surface-tertiary',
      )}
    >
      <span aria-hidden="true" className="shrink-0">
        <Avatar src={topic.avatar_url} name={topic.title} size="sm" className="size-7" />
      </span>
      <span className="min-w-0 truncate">{topic.title}</span>
    </Link>
  )
}

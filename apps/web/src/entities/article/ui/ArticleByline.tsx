import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatTime } from '@/shared/lib'
import { Avatar } from '@/shared/ui'
import type { ArticleCardModel } from '../model/article-types.ts'

type ArticleBylineProps = {
  author: ArticleCardModel['author']
  topic: ArticleCardModel['topic']
  published_at?: string | null
  /** Уже посчитанная подпись времени (карточка ленты); иначе форматируется из `published_at`. */
  time_label?: string
  follow?: ReactNode
  menu?: ReactNode
}

/** Автор и тема: аватар автора с бейджем темы, имя, ссылка на тему и время. */
export function ArticleByline({ author, topic, published_at, time_label, follow, menu }: ArticleBylineProps) {
  const label = time_label ?? (published_at ? formatTime(published_at) : '')

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="relative size-10 shrink-0 overflow-visible">
        <Link to={author.href} className="block rounded-avatar outline-offset-2" aria-label={author.display_name}>
          <Avatar src={author.avatar_url} name={author.display_name} size="md" />
        </Link>
        {topic.id ? (
          <Link
            to={topic.href}
            className="absolute -bottom-1 -right-1 z-10 rounded-avatar outline-offset-2"
            aria-label={topic.title}
          >
            <Avatar src={topic.avatar_url} name={topic.title} className="size-5 text-[10px] ring-2 ring-surface" />
          </Link>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to={author.href}
          className="truncate text-[15px] font-semibold text-foreground outline-offset-2 hover:underline"
        >
          {author.display_name}
        </Link>
        <div className="flex min-w-0 items-center gap-1 text-sm text-muted">
          <Link to={topic.href} className="truncate outline-offset-2 hover:underline">
            {topic.title}
          </Link>
          {published_at && label ? (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={published_at} className="shrink-0">
                {label}
              </time>
            </>
          ) : null}
        </div>
      </div>
      {follow || menu ? (
        <div className="flex items-center gap-1 lg:gap-2">
          {follow}
          {menu}
        </div>
      ) : null}
    </div>
  )
}

import { Link } from 'react-router'
import type { UserCommentModel } from '@/entities/comment'
import { Card } from '@/shared/ui'
import { formatTime } from '@/shared/lib'

type UserCommentRowProps = { comment: UserCommentModel }

/** Фрагмент комментария, название статьи и дата. Ведёт к комментарию на странице статьи. */
export function UserCommentRow({ comment }: UserCommentRowProps) {
  return (
    <li>
      <Card>
        <Card.Content className="flex flex-col gap-3 px-5 py-5">
          <Link
            to={comment.href}
            className="whitespace-pre-wrap break-words text-[15px] leading-6 outline-offset-2 hover:underline"
          >
            {comment.excerpt}
          </Link>
          <p className="flex min-w-0 items-center gap-2 text-xs text-muted">
            <Link
              to={`/p/${encodeURIComponent(comment.article_slug)}`}
              className="min-w-0 truncate outline-offset-2 hover:underline"
            >
              {comment.article_title}
            </Link>
            <time className="shrink-0" dateTime={comment.created_at}>
              {formatTime(comment.created_at)}
            </time>
          </p>
        </Card.Content>
      </Card>
    </li>
  )
}

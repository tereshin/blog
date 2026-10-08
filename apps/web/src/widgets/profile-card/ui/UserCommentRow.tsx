import { Link } from 'react-router'
import type { UserCommentModel } from '@/entities/comment'
import { formatTime } from '@/shared/lib'

type UserCommentRowProps = { comment: UserCommentModel }

/** Фрагмент комментария, название статьи и дата. Ведёт к комментарию на странице статьи. */
export function UserCommentRow({ comment }: UserCommentRowProps) {
  return (
    <li className="flex flex-col gap-1 border-b border-separator py-3 last:border-b-0">
      <Link to={comment.href} className="text-sm outline-offset-2 hover:underline">
        {comment.excerpt}
      </Link>
      <p className="flex min-w-0 items-center gap-2 text-xs text-muted">
        <span className="truncate">{comment.article_title}</span>
        <time dateTime={comment.created_at}>{formatTime(comment.created_at)}</time>
      </p>
    </li>
  )
}
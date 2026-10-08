import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { formatCount } from '@/shared/lib'
import { Avatar } from '@/shared/ui'
import type { PopularCommentModel } from '../api/comment-schema.ts'

type PopularCommentItemProps = { comment: PopularCommentModel }

/** Запись правой карточки (FR-068): аватар, имя, «в посте», усечённое название, фрагмент, «N реакций». */
export function PopularCommentItem({ comment }: PopularCommentItemProps) {
  const { t, locale } = useT()
  return (
    <li>
      <Link
        to={comment.href}
        className="flex gap-3 rounded-xl p-2 text-foreground outline-offset-2 hover:bg-surface-secondary"
      >
        <Avatar src={comment.author_avatar_url} name={comment.author_name} size="sm" className="mt-0.5 shrink-0" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{comment.author_name}</span>
          <span className="truncate text-xs text-muted">
            {t('comment.in_post')} «{comment.article_title}»
          </span>
          <span className="line-clamp-3 text-sm">{comment.excerpt}</span>
          <span className="text-xs text-muted">
            {t('comment.reactions', { count: comment.reaction_count, value: formatCount(comment.reaction_count, locale) })}
          </span>
        </span>
      </Link>
    </li>
  )
}

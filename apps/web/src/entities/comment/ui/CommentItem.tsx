import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Avatar } from '@/shared/ui'
import type { CommentNode, CommentPlacement } from '../model/comment-types.ts'

type CommentItemProps = {
  comment: CommentNode
  placement?: CommentPlacement
  renderReactions?: (comment: CommentNode) => ReactNode
  renderActions?: (comment: CommentNode, placement: CommentPlacement) => ReactNode
  /** Форма ответа под этой репликой. `null` — поле закрыто. */
  renderReply?: (comment: CommentNode) => ReactNode
}

/** Одна реплика: автор, время, текст или заглушка, слоты реакций и действий. */
export function CommentItem({ comment, placement = { root_id: null }, renderReactions, renderActions, renderReply }: CommentItemProps) {
  const { t } = useT()
  const stub = comment.status === 'deleted' ? t('comment.deleted') : comment.status === 'hidden' ? t('comment.hidden') : null
  const reply_form = renderReply?.(comment) ?? null
  const has_thread = comment.replies.length > 0 || reply_form !== null
  return (
    <article id={`comment-${comment.id}`} className="flex gap-3 py-3" aria-label={comment.author.display_name}>
      <Avatar src={comment.author.avatar_url} name={comment.author.display_name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium">{comment.author.display_name}</span>
          <time dateTime={comment.created_at} className="text-muted">
            {comment.time_label}
          </time>
          {comment.status === 'pending' ? <span className="text-muted">{t('comment.pending')}</span> : null}
          {comment.edited_at && !stub ? <span className="text-muted">{t('comment.edited')}</span> : null}
        </div>
        {stub ? <p className="mt-1 text-sm text-muted">{stub}</p> : <p className="mt-1 whitespace-pre-line break-words text-sm">{comment.body}</p>}
        {renderReactions || renderActions ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {renderReactions?.(comment)}
            {renderActions?.(comment, placement)}
          </div>
        ) : null}
        {has_thread ? (
          <div className="mt-1 border-l border-separator pl-3">
            {reply_form}
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                placement={{ root_id: placement.root_id ?? comment.id }}
                renderReactions={renderReactions}
                renderActions={renderActions}
                renderReply={renderReply}
              />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}

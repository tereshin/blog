import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Avatar, BaseIcon, Button, ErrorState } from '@/shared/ui'
import type { CommentNode, CommentPlacement } from '../model/comment-types.ts'
import { sortComments } from '../model/sort-comments.ts'
import type { CommentSort } from '../model/sort-comments.ts'
import { useReplies } from '../model/useReplies.ts'
import { CommentSortMenu } from './CommentSortMenu.tsx'

type CommentItemProps = {
  article_id?: string | undefined
  comment: CommentNode
  anchor_id?: string
  placement?: CommentPlacement
  renderReactions?: (comment: CommentNode) => ReactNode
  renderActions?: (
    comment: CommentNode,
    placement: CommentPlacement,
    expand: () => void,
  ) => ReactNode
  renderReply?: (comment: CommentNode) => ReactNode
}

function containsAnchor(comments: CommentNode[], anchor_id: string): boolean {
  return comments.some(
    (comment) => comment.id === anchor_id || containsAnchor(comment.replies, anchor_id),
  )
}

/** Ответы свёрнуты; прямая ссылка и ответ раскрывают нужную ветку. */
export function CommentItem({
  comment,
  article_id,
  anchor_id = '',
  placement = { root_id: null },
  renderReactions,
  renderActions,
  renderReply,
}: CommentItemProps) {
  const { t } = useT()
  const [expansion, setExpansion] = useState({ is_open: false, dismissed_anchor: '' })
  const is_expanded =
    expansion.is_open ||
    (anchor_id !== expansion.dismissed_anchor && containsAnchor(comment.replies, anchor_id))
  const setExpanded = (is_open: boolean) =>
    setExpansion({ is_open, dismissed_anchor: is_open ? '' : anchor_id })
  const [sort, setSort] = useState<CommentSort>('oldest')

  const stub =
    comment.status === 'deleted'
      ? t('comment.deleted')
      : comment.status === 'hidden'
        ? t('comment.hidden')
        : null
  const reply_form = renderReply?.(comment) ?? null
  const reply_count = comment.reply_count ?? comment.replies.length
  const has_replies = reply_count > 0
  const query = useReplies(article_id, comment.id, sort, is_expanded && placement.root_id === null)
  const loaded = query.data?.pages.flatMap((page) => page.comments) ?? []
  const pinned = comment.replies.filter(
    (reply) => reply.id === anchor_id && !loaded.some((item) => item.id === reply.id),
  )
  const replies = article_id ? [...pinned, ...loaded] : sortComments(comment.replies, sort)
  useEffect(() => {
    if (is_expanded && anchor_id)
      document.getElementById(`comment-${anchor_id}`)?.scrollIntoView({ block: 'center' })
  }, [is_expanded, anchor_id, query.data])
  const replies_id = `replies-${comment.id}`
  return (
    <article
      id={`comment-${comment.id}`}
      className="scroll-mt-24 py-5"
      aria-label={comment.author.display_name}
    >
      <div className="flex items-center gap-3">
        <Avatar
          src={comment.author.avatar_url}
          name={comment.author.display_name}
          size="sm"
          className="shrink-0"
        />
        <div className="min-w-0">
          <p className="break-words text-[15px] font-semibold leading-5">
            {comment.author.display_name}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
            <time dateTime={comment.created_at}>{comment.time_label}</time>
            {comment.status === 'pending' ? (
              <span role="status">{t('comment.pending')}</span>
            ) : null}
            {comment.edited_at && !stub ? <span>{t('comment.edited')}</span> : null}
          </div>
        </div>
      </div>
      <p
        className={`mt-3 whitespace-pre-wrap break-words text-[15px] leading-6 ${stub ? 'text-muted' : 'text-foreground'}`}
      >
        {stub ?? comment.body}
      </p>
      {!stub && comment.media?.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {comment.media.map((file) => (
            <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer">
              <img
                src={file.url}
                alt={file.alt}
                loading="lazy"
                className="max-h-64 w-full rounded-xl object-contain"
              />
            </a>
          ))}
        </div>
      ) : null}
      {!stub && comment.mentions?.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {comment.mentions.map((user) => (
            <span key={user.user_id} className="text-sm text-accent">
              @{user.display_name}
            </span>
          ))}
        </div>
      ) : null}
      {!stub && renderReactions ? <div className="mt-3">{renderReactions(comment)}</div> : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {has_replies ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-0 text-accent"
            aria-expanded={is_expanded}
            aria-controls={replies_id}
            onPress={() => setExpanded(!is_expanded)}
          >
            {is_expanded
              ? t('comment.collapse_replies')
              : t('comment.replies', { count: reply_count })}
            <BaseIcon
              name="down"
              style="line"
              size={16}
              className={is_expanded ? 'rotate-180' : ''}
            />
          </Button>
        ) : null}
        {renderActions?.(comment, placement, () => setExpanded(true))}
      </div>
      {reply_form ? <div className="mt-3">{reply_form}</div> : null}
      {has_replies ? (
        <div
          id={replies_id}
          hidden={!is_expanded}
          className="mt-3 border-l-2 border-separator pl-3 sm:pl-5"
        >
          {is_expanded ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">
                  {t('comment.replies', { count: reply_count })}
                </span>
                <CommentSortMenu value={sort} onChange={setSort} />
              </div>
              {article_id && query.isPending ? (
                <p role="status" className="py-3 text-sm text-muted">
                  {t('comment.loading')}
                </p>
              ) : null}
              {article_id && query.isError ? (
                <ErrorState title={t('comment.load_error')} onRetry={() => void query.refetch()} />
              ) : null}
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  article_id={article_id}
                  comment={reply}
                  anchor_id={anchor_id}
                  placement={{ root_id: placement.root_id ?? comment.id }}
                  renderReactions={renderReactions}
                  renderActions={renderActions}
                  renderReply={renderReply}
                />
              ))}
              {query.hasNextPage ? (
                <Button
                  variant="ghost"
                  className="w-full"
                  isDisabled={query.isFetchingNextPage}
                  onPress={() => void query.fetchNextPage()}
                >
                  {t('feed.load_more')}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { useT } from '@/shared/i18n'
import { useWindowList } from '@/shared/lib'
import { Button, CommentIcon, EmptyState, ErrorState, Skeleton } from '@/shared/ui'
import type { CommentsState } from '../model/useComments.ts'
import type { CommentNode, CommentPlacement } from '../model/comment-types.ts'
import { sortComments } from '../model/sort-comments.ts'
import type { CommentSort } from '../model/sort-comments.ts'
import { CommentItem } from './CommentItem.tsx'
import { CommentSortMenu } from './CommentSortMenu.tsx'
import { PopularCommentItem } from './PopularCommentItem.tsx'

const VIRTUALIZATION_THRESHOLD = 50

type CommentThreadProps = {
  toolbar?: ReactNode
  article_id?: string
  sort?: CommentSort
  onSort?: (sort: CommentSort) => void
  state: CommentsState
  renderReactions?: (comment: CommentNode) => ReactNode
  renderActions?: (
    comment: CommentNode,
    placement: CommentPlacement,
    expand: () => void,
  ) => ReactNode
  renderReply?: (comment: CommentNode) => ReactNode
}

function scrollToHash(): void {
  const id = window.location.hash.startsWith('#comment-') ? window.location.hash.slice(1) : ''
  if (!id) return
  document.getElementById(id)?.scrollIntoView({ block: 'center' })
}

function CommentThreadRoot({
  state,
  toolbar,
  article_id,
  sort: server_sort,
  onSort,
  renderReactions,
  renderActions,
  renderReply,
}: CommentThreadProps) {
  const { t } = useT()
  const { hash } = useLocation()
  const anchor_id = hash.startsWith('#comment-') ? hash.slice('#comment-'.length) : ''
  const [local_sort, setSort] = useState<CommentSort>('best')
  const sort = server_sort ?? local_sort
  const ready = state.status === 'ok'
  const comments =
    state.status === 'ok'
      ? article_id
        ? state.comments
        : sortComments(state.comments, sort)
      : []
  const comment_ids = comments.map((comment) => comment.id)
  const comment_by_id = useMemo(
    () => new Map(comments.map((comment) => [comment.id, comment])),
    [comments],
  )
  const { virtualizer, scroll_margin, setElement, items: virtual_items } = useWindowList(
    comment_ids,
    140,
  )
  const handleNearEnd = useCallback(() => {
    if (state.status === 'ok' && state.has_next) state.fetchNext()
  }, [state])

  useEffect(() => {
    if (!ready) return
    const frame = requestAnimationFrame(scrollToHash)
    return () => cancelAnimationFrame(frame)
  }, [ready, hash])

  useEffect(() => {
    const last = virtual_items.at(-1)?.index ?? -1
    if (comment_ids.length > 0 && last >= Math.floor(comment_ids.length * 0.8) - 1) handleNearEnd()
  }, [comment_ids.length, handleNearEnd, virtual_items])

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="flex flex-col gap-3 py-4" aria-busy="true" aria-label={t('comment.loading')}>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-4/5" />
      </div>
    )
  }
  if (state.status === 'error')
    return <ErrorState title={t('comment.load_error')} onRetry={state.refetch} />
  if (state.status === 'empty')
    return (
      <div>
        <div className="flex justify-end">{toolbar}</div>
        <EmptyState
          title={t('comment.empty')}
          icon={<CommentIcon width={28} height={28} />}
          className="min-h-0 rounded-none bg-transparent px-0 py-6 shadow-none"
        />
      </div>
    )

  function renderComment(comment: CommentNode) {
    return (
      <CommentItem
        article_id={article_id}
        comment={comment}
        anchor_id={anchor_id}
        placement={{ root_id: null }}
        renderReactions={renderReactions}
        renderActions={renderActions}
        renderReply={renderReply}
      />
    )
  }

  return (
    <div>
      <h2 className="sr-only">{t('comment.discussion')}</h2>
      <div className="mb-1 flex items-center justify-between gap-2">
        <CommentSortMenu value={sort} onChange={onSort ?? setSort} />
        {toolbar}
      </div>
      {comment_ids.length > VIRTUALIZATION_THRESHOLD ? (
        <div
          ref={setElement}
          className="relative"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtual_items.map((item) => {
            const comment = comment_by_id.get(String(item.key))
            if (!comment) return null
            return (
              <div
                key={item.key}
                ref={virtualizer.measureElement}
                data-index={item.index}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${item.start - scroll_margin}px)` }}
              >
                {renderComment(comment)}
              </div>
            )
          })}
        </div>
      ) : (
        comments.map((comment) => <div key={comment.id}>{renderComment(comment)}</div>)
      )}
      {state.has_next ? (
        <Button variant="secondary" className="mt-3 w-full" onPress={state.fetchNext}>
          {t('feed.load_more')}
        </Button>
      ) : null}
    </div>
  )
}

/** Список корней и ответов. Загрузка, пустота и ошибка остаются в обсуждении, не на всю колонку. */
export const CommentThread = Object.assign(CommentThreadRoot, {
  Item: CommentItem,
  Popular: PopularCommentItem,
})

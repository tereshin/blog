import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState, Skeleton } from '@/shared/ui'
import type { CommentsState } from '../model/useComments.ts'
import type { CommentNode, CommentPlacement } from '../model/comment-types.ts'
import { sortComments } from '../model/sort-comments.ts'
import type { CommentSort } from '../model/sort-comments.ts'
import { CommentSortMenu } from './CommentSortMenu.tsx'
import { CommentItem } from './CommentItem.tsx'

type CommentThreadProps = {
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

/** Список корней и ответов. Загрузка, пустота и ошибка остаются в обсуждении, не на всю колонку. */
export function CommentThread({
  state,
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

  useEffect(() => {
    if (!ready) return
    const frame = requestAnimationFrame(scrollToHash)
    return () => cancelAnimationFrame(frame)
  }, [ready, hash])

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
  if (state.status === 'empty') return <EmptyState title={t('comment.empty')} />

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 border-b border-separator pb-3">
        <h2 className="text-base font-semibold">{t('comment.discussion')}</h2>
        <CommentSortMenu value={sort} onChange={onSort ?? setSort} />
      </div>
      {(article_id ? state.comments : sortComments(state.comments, sort)).map((comment) => (
        <CommentItem
          key={comment.id}
          article_id={article_id}
          comment={comment}
          anchor_id={anchor_id}
          placement={{ root_id: null }}
          renderReactions={renderReactions}
          renderActions={renderActions}
          renderReply={renderReply}
        />
      ))}
      {state.has_next ? (
        <Button variant="secondary" className="mt-3 w-full" onPress={state.fetchNext}>
          {t('feed.load_more')}
        </Button>
      ) : null}
    </div>
  )
}

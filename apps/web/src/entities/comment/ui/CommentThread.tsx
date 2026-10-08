import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState, Skeleton } from '@/shared/ui'
import type { CommentsState } from '../model/useComments.ts'
import type { CommentNode } from '../model/comment-types.ts'
import { CommentItem } from './CommentItem.tsx'

type CommentThreadProps = {
  state: CommentsState
  renderReactions?: (comment: CommentNode) => ReactNode
  renderActions?: (comment: CommentNode) => ReactNode
}

function scrollToHash(): void {
  const id = window.location.hash.startsWith('#comment-') ? window.location.hash.slice(1) : ''
  if (!id) return
  document.getElementById(id)?.scrollIntoView({ block: 'center' })
}

/** Список корней и ответов. Загрузка, пустота и ошибка остаются в обсуждении, не на всю колонку. */
export function CommentThread({ state, renderReactions, renderActions }: CommentThreadProps) {
  const { t } = useT()
  const ready = state.status === 'ok'

  useEffect(() => {
    if (ready) scrollToHash()
  }, [ready])

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="flex flex-col gap-3 py-4" aria-busy="true" aria-label={t('comment.loading')}>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-4/5" />
      </div>
    )
  }
  if (state.status === 'error') return <ErrorState title={t('comment.load_error')} onRetry={state.refetch} />
  if (state.status === 'empty') return <EmptyState title={t('comment.empty')} />

  return (
    <div>
      {state.comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} renderReactions={renderReactions} renderActions={renderActions} />
      ))}
      {state.has_next ? (
        <Button variant="ghost" onPress={state.fetchNext}>
          {t('feed.load_more')}
        </Button>
      ) : null}
    </div>
  )
}

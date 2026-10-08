import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { ArticleCard } from '@/entities/article'
import type { FeedMode } from '@/entities/article'
import { useT } from '@/shared/i18n'
import { ErrorState } from '@/shared/ui'
import { useFeed } from '../model/useFeed.ts'
import { FeedEmpty } from './FeedEmpty.tsx'
import { FeedItem } from './FeedItem.tsx'
import type { FeedSlots } from './FeedItem.tsx'
import { PlainFeedList } from './PlainFeedList.tsx'
import { VirtualFeedList } from './VirtualFeedList.tsx'

/** Выше этого числа карточек список виртуализируется (в DOM только видимые). */
const VIRTUALIZATION_THRESHOLD = 100
const SKELETON_COUNT = 3

type FeedProps = FeedSlots & {
  mode: FeedMode
  /** Полоса над первой карточкой («Скрыто N просмотренных»). */
  banner?: ReactNode
}

function FeedSkeletons({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, index) => (
        <ArticleCard.Skeleton key={index} />
      ))}
    </div>
  )
}

/** Лента карточек выбранного режима. Загрузка, пустота и ошибка показываются в центре, подгрузка не сбрасывает прокрутку. */
export function Feed({ mode, banner, ...slots }: FeedProps) {
  const { t } = useT()
  const state = useFeed(mode)

  const has_next = state.status === 'ok' && state.has_next
  const is_busy = state.status === 'ok' && (state.is_fetching_next || state.next_error)
  const fetchNext = state.status === 'ok' ? state.fetchNext : undefined
  const handleNearEnd = useCallback(() => {
    if (has_next && !is_busy) fetchNext?.()
  }, [has_next, is_busy, fetchNext])

  if (state.status === 'loading') return <FeedSkeletons count={SKELETON_COUNT} />
  if (state.status === 'error') return <ErrorState title={t('feed.load_error')} onRetry={state.refetch} />
  if (state.article_ids.length === 0) return <FeedEmpty />

  const renderItem = (article_id: string) => {
    const article = state.article_by_id.get(article_id)
    return article ? <FeedItem article={article} slots={slots} /> : null
  }
  const List = state.article_ids.length > VIRTUALIZATION_THRESHOLD ? VirtualFeedList : PlainFeedList

  return (
    <div className="flex flex-col gap-4">
      {banner}
      <List article_ids={state.article_ids} renderItem={renderItem} onNearEnd={handleNearEnd} />
      {state.is_fetching_next ? <ArticleCard.Skeleton /> : null}
      {state.next_error ? <ErrorState title={t('feed.load_more_error')} onRetry={state.fetchNext} className="py-4" /> : null}
    </div>
  )
}

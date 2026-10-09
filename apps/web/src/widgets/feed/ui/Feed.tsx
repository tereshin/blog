import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { ArticleCard, useArticleStates } from '@/entities/article'
import type { FeedMode } from '@/entities/article'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { findScrollParent, readFeedReturn, saveFeedReturn } from '@/shared/lib'
import { ErrorState } from '@/shared/ui'
import { useFeedLive } from '../model/useFeedLive.ts'
import { useFeed } from '../model/useFeed.ts'
import { useSeenArticles } from '../model/useSeenArticles.ts'
import { FeedEmpty } from './FeedEmpty.tsx'
import { FeedItem } from './FeedItem.tsx'
import type { FeedSlots } from './FeedItem.tsx'
import { PlainFeedList } from './PlainFeedList.tsx'
import { SeenBanner } from './SeenBanner.tsx'
import { VirtualFeedList } from './VirtualFeedList.tsx'

/** Выше этого числа карточек список виртуализируется (в DOM только видимые). */
const VIRTUALIZATION_THRESHOLD = 100
const SKELETON_COUNT = 3

type FeedProps = FeedSlots & {
  mode: FeedMode
  /** Ключ полосы просмотренного. Для темы это `topic:{id}`, иначе совпадает с режимом. */
  feed_key?: string
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
export function Feed({ mode, feed_key = mode, ...slots }: FeedProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const state = useFeed(mode)
  const seen = useSeenArticles(feed_key)
  const root_ref = useRef<HTMLDivElement>(null)
  const article_ids = state.status === 'ok' ? state.article_ids : []
  const viewer_states = useArticleStates(article_ids, viewer.status === 'member')
  useFeedLive(mode, article_ids)

  const has_next = state.status === 'ok' && state.has_next
  const is_busy = state.status === 'ok' && (state.is_fetching_next || state.next_error)
  const fetchNext = state.status === 'ok' ? state.fetchNext : undefined
  const handleNearEnd = useCallback(() => {
    if (has_next && !is_busy) fetchNext?.()
  }, [has_next, is_busy, fetchNext])

  // Возврат со статьи: каркас сначала ставит центр в начало, затем кадр возвращает сохранённую прокрутку.
  const is_ready = state.status === 'ok' && state.article_ids.length > 0
  useEffect(() => {
    const saved = readFeedReturn()
    if (!is_ready || !saved || saved.mode !== mode) return
    const frame = requestAnimationFrame(() => {
      const scroller = findScrollParent(root_ref.current)
      if (scroller) scroller.scrollTo({ top: saved.scroll_top })
      else window.scrollTo({ top: saved.scroll_top })
    })
    return () => cancelAnimationFrame(frame)
  }, [mode, is_ready])

  const rememberReturn = (event: MouseEvent<HTMLDivElement>) => {
    const link = event.target instanceof Element ? event.target.closest('a') : null
    const href = link?.getAttribute('href') ?? ''
    if (!href.startsWith('/p/') || href.includes('#')) return
    const scroller = findScrollParent(root_ref.current)
    saveFeedReturn({ mode, feed_key, scroll_top: scroller?.scrollTop ?? window.scrollY })
  }

  if (state.status === 'loading' || state.status === 'idle') return <FeedSkeletons count={SKELETON_COUNT} />
  if (state.status === 'error') return <ErrorState title={t('feed.load_error')} onRetry={state.refetch} />
  if (state.article_ids.length === 0) return <FeedEmpty />

  const hidden_ids = state.article_ids.filter((id) => seen.seen_ids.has(id))
  const visible_ids = seen.is_revealed ? state.article_ids : state.article_ids.filter((id) => !seen.seen_ids.has(id))
  const renderItem = (article_id: string) => {
    const article = state.article_by_id.get(article_id)
    const viewer_state = viewer_states.get(article_id)
    return article ? <FeedItem article={article} slots={slots} onExpanded={seen.mark} {...(viewer_state ? { viewer_state } : {})} /> : null
  }
  const List = visible_ids.length > VIRTUALIZATION_THRESHOLD ? VirtualFeedList : PlainFeedList

  return (
    <div ref={root_ref} className="flex flex-col gap-4" onClick={rememberReturn}>
      {hidden_ids.length > 0 && !seen.is_dismissed ? <SeenBanner count={hidden_ids.length} onReveal={seen.reveal} onDismiss={seen.dismiss} /> : null}
      {visible_ids.length > 0 ? <List article_ids={visible_ids} renderItem={renderItem} onNearEnd={handleNearEnd} /> : null}
      {state.is_fetching_next ? <ArticleCard.Skeleton /> : null}
      {state.next_error ? <ErrorState title={t('feed.load_more_error')} onRetry={state.fetchNext} className="py-4" /> : null}
    </div>
  )
}

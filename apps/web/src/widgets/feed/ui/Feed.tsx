import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { ArticleCard, useArticleStates } from '@/entities/article'
import type { FeedMode } from '@/entities/article'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState, EyeIcon } from '@/shared/ui'
import { useFeedLive } from '../model/useFeedLive.ts'
import { useFeed } from '../model/useFeed.ts'
import { useFeedReturn } from '../model/useFeedReturn.ts'
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
  empty?: ReactNode
}

function FeedSkeletons({ count }: { count: number }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 max-w-[var(--shell-content-width,640px)] mx-auto">
      {Array.from({ length: count }, (_, slot) => (
        <ArticleCard.Skeleton key={`skeleton-${slot}`} />
      ))}
    </div>
  )
}

/** Лента карточек выбранного режима. Загрузка, пустота и ошибка показываются в центре, подгрузка не сбрасывает прокрутку. */
export function Feed({ mode, feed_key = mode, empty, ...slots }: FeedProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const state = useFeed(mode)
  const article_ids = state.status === 'ok' ? state.article_ids : []
  const seen = useSeenArticles(feed_key)
  const should_hide_seen = mode !== 'fresh' && mode !== 'mine'
  const viewer_states = useArticleStates(article_ids, viewer.status === 'member')
  useFeedLive(mode, article_ids)

  const has_next = state.status === 'ok' && state.has_next
  const is_busy = state.status === 'ok' && (state.is_fetching_next || state.next_error)
  const fetchNext = state.status === 'ok' ? state.fetchNext : undefined
  const handleNearEnd = useCallback(() => {
    if (has_next && !is_busy) fetchNext?.()
  }, [has_next, is_busy, fetchNext])

  const is_ready = state.status === 'ok' && state.article_ids.length > 0
  const { root_ref, rememberReturn } = useFeedReturn(mode, feed_key, is_ready)

  if (state.status === 'loading' || state.status === 'idle')
    return <FeedSkeletons count={SKELETON_COUNT} />
  if (state.status === 'error')
    return <ErrorState title={t('feed.load_error')} onRetry={state.refetch} />
  if (state.article_ids.length === 0) return empty ?? <FeedEmpty description={t('feed.empty_hint')} />

  const hidden_ids = should_hide_seen ? state.article_ids.filter((id) => seen.seen_ids.has(id)) : []
  const visible_ids =
    !should_hide_seen || seen.is_revealed
      ? state.article_ids
      : state.article_ids.filter((id) => !seen.seen_ids.has(id))
  const banner =
    hidden_ids.length > 0 && !seen.is_dismissed ? (
      <SeenBanner count={hidden_ids.length} onReveal={seen.reveal} onDismiss={seen.dismiss} />
    ) : null
  const renderItem = (article_id: string) => {
    const article = state.article_by_id.get(article_id)
    const viewer_state = viewer_states.get(article_id)
    if (!article) return null
    return (
      <FeedItem
        article={article}
        slots={slots}
        onExpanded={seen.mark}
        lead={article_id === visible_ids[0] ? banner : null}
        {...(viewer_state ? { viewer_state } : {})}
      />
    )
  }
  const List = visible_ids.length > VIRTUALIZATION_THRESHOLD ? VirtualFeedList : PlainFeedList

  return (
    <div
      ref={root_ref}
      className="flex w-full min-w-0 flex-col gap-4 max-w-[var(--shell-content-width,640px)] mx-auto"
      onClick={rememberReturn}
    >
      {visible_ids.length > 0 ? (
        <List article_ids={visible_ids} renderItem={renderItem} onNearEnd={handleNearEnd} />
      ) : (
        <EmptyState
          title={t('feed.seen.all')}
          description={t('feed.seen.all_hint')}
          icon={<EyeIcon width={28} height={28} />}
        >
          <Button variant="primary" onPress={seen.reveal}>
            {t('feed.seen.show')}
          </Button>
        </EmptyState>
      )}
      {state.is_fetching_next ? <ArticleCard.Skeleton /> : null}
      {state.next_error ? (
        <ErrorState title={t('feed.load_more_error')} onRetry={state.fetchNext} className="py-4" />
      ) : null}
    </div>
  )
}

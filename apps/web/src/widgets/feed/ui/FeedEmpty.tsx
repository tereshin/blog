import type { FeedMode } from '@/entities/article'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui'

/** Пустая лента: объяснение внутри центра, боковые карточки остаются на месте. */
export function FeedEmpty({ mode }: { mode: FeedMode }) {
  const { t } = useT()
  const description_key = mode.startsWith('topic:') ? 'feed.topic.empty_hint' : mode === 'mine' ? 'feed.mine.empty_hint' : 'feed.empty_hint'
  return <EmptyState title={t('feed.empty')} description={t(description_key)} />
}

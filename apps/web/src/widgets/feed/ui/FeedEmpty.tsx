import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui'

/** Пустая лента: объяснение внутри центра, боковые карточки остаются на месте. */
export function FeedEmpty() {
  const { t } = useT()
  return <EmptyState title={t('feed.empty')} description={t('feed.empty_hint')} />
}

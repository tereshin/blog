import { useShortTopicList } from '../model/useShortTopicList.ts'
import { useT } from '@/shared/i18n'
import { ErrorState, Skeleton } from '@/shared/ui'
import { DiscoveryFollow } from './DiscoveryFollow.tsx'
import { DiscoveryTopicRow } from './DiscoveryTopicRow.tsx'
import type { DiscoveryTopic } from './DiscoveryTopicRow.tsx'

type ShortTopicListProps = { topics: DiscoveryTopic[] }

export function ShortTopicList({ topics }: ShortTopicListProps) {
  const { t } = useT()
  const { follows } = useShortTopicList(topics)
  return (
    <>
      {follows.is_error ? <ErrorState title={t('follow.failed')} onRetry={follows.retry} /> : null}
      <ul>
        {topics.map((topic) => (
          <li key={topic.id}>
            <DiscoveryTopicRow
              topic={topic}
              action={
                follows.is_pending ? (
                  <Skeleton className="h-8 w-24 rounded-pill" />
                ) : follows.is_error ? null : (
                  <DiscoveryFollow target_type="topic" target_id={topic.id} />
                )
              }
            />
          </li>
        ))}
      </ul>
    </>
  )
}

import { useVirtualTopicList } from '../model/useVirtualTopicList.ts'
import { useT } from '@/shared/i18n'
import { ErrorState, Skeleton } from '@/shared/ui'
import { DiscoveryFollow } from './DiscoveryFollow.tsx'
import { DiscoveryTopicRow } from './DiscoveryTopicRow.tsx'
import type { DiscoveryTopic } from './DiscoveryTopicRow.tsx'

type VirtualTopicListProps = { topics: DiscoveryTopic[] }

export function VirtualTopicList({ topics }: VirtualTopicListProps) {
  const { t } = useT()
  const { follows, virtualizer, scroll_margin, setElement, items } = useVirtualTopicList(topics)
  return (
    <>
      {follows.is_error ? <ErrorState title={t('follow.failed')} onRetry={follows.retry} /> : null}
      <ol ref={setElement} className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((item) => {
          const topic = topics[item.index]
          if (!topic) return null
          return (
            <li
              key={topic.id}
              data-index={item.index}
              ref={virtualizer.measureElement}
              aria-posinset={item.index + 1}
              aria-setsize={topics.length}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${item.start - scroll_margin}px)` }}
            >
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
          )
        })}
      </ol>
    </>
  )
}

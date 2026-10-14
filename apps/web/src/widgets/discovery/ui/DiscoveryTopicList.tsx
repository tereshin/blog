import type { DiscoveryTopic } from './DiscoveryTopicRow.tsx'
import { ShortTopicList } from './ShortTopicList.tsx'
import { VirtualTopicList } from './VirtualTopicList.tsx'

type DiscoveryTopicListProps = { topics: DiscoveryTopic[] }

export function DiscoveryTopicList({ topics }: DiscoveryTopicListProps) {
  return topics.length > 100 ? (
    <VirtualTopicList topics={topics} />
  ) : (
    <ShortTopicList topics={topics} />
  )
}

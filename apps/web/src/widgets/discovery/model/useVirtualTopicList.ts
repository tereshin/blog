import { useFollowStates } from '@/features/follow'
import type { Topic } from '@/entities/topic'
import { useWindowList } from '@/shared/lib'

export function useVirtualTopicList(topics: Pick<Topic, 'id' | 'title' | 'slug' | 'avatar_url'>[]) {
  const { virtualizer, scroll_margin, setElement, items } = useWindowList(
    topics.map((topic) => topic.id),
  )
  const visible_topics = items.flatMap((item) => {
    const topic = topics[item.index]
    return topic ? [topic] : []
  })
  const follows = useFollowStates(
    visible_topics.map((topic) => ({ target_type: 'topic', target_id: topic.id })),
  )
  return { follows, virtualizer, scroll_margin, setElement, items }
}

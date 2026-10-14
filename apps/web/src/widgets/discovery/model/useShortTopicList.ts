import { useFollowStates } from '@/features/follow'
import type { Topic } from '@/entities/topic'

export function useShortTopicList(topics: Pick<Topic, 'id' | 'title' | 'slug' | 'avatar_url'>[]) {
  const follows = useFollowStates(
    topics.map((topic) => ({ target_type: 'topic', target_id: topic.id })),
  )
  return { follows }
}

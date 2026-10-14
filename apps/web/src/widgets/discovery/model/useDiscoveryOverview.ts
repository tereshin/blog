import { useTopics } from '@/entities/topic'
import { useRating } from '@/entities/user'

export function useDiscoveryOverview() {
  const rating = useRating(5)
  const topics = useTopics()
  return {
    rating,
    topics,
    people: rating.data?.pages[0]?.items ?? [],
    preview_topics: (topics.data ?? []).filter((topic) => topic.status === 'active').slice(0, 5),
  }
}

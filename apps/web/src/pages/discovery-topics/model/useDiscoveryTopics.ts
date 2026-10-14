import { useTopics } from '@/entities/topic'

export function useDiscoveryTopics() {
  const query = useTopics()
  const topics = (query.data ?? []).filter((topic) => topic.status === 'active')
  return { query, topics }
}

import { useQuery } from '@tanstack/react-query'
import { getTopic } from '../api/get-topic.ts'
import { topicKeys } from './topic-keys.ts'

export function useTopic(slug: string) {
  return useQuery({
    queryKey: topicKeys.detail(slug),
    queryFn: ({ signal }) => getTopic(slug, signal),
    enabled: slug.length > 0,
  })
}

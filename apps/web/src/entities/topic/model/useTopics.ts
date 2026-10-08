import { useQuery } from '@tanstack/react-query'
import { getTopics } from '../api/get-topics.ts'
import { topicKeys } from './topic-keys.ts'

export function useTopics() {
  return useQuery({ queryKey: topicKeys.list(), queryFn: ({ signal }) => getTopics(signal), staleTime: 60_000 })
}

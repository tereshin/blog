import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllTopics, topicKeys } from '@/entities/topic'
import { createTopic, reorderTopics, updateTopic } from '../api/manage-topics.ts'
import type { TopicDraft } from '../api/manage-topics.ts'

export function useManageTopics() {
  const query_client = useQueryClient()
  const topics = useQuery({ queryKey: topicKeys.admin(), queryFn: ({ signal }) => getAllTopics(signal) })

  const refresh = async () => {
    await query_client.invalidateQueries({ queryKey: topicKeys.all })
  }

  const create = useMutation({ mutationFn: (input: TopicDraft) => createTopic(input), onSuccess: refresh })
  const update = useMutation({
    mutationFn: (input: { id: string; body: Partial<TopicDraft> & { status?: 'active' | 'archived' } }) => updateTopic(input.id, input.body),
    onSuccess: refresh,
  })
  const reorder = useMutation({ mutationFn: (topic_ids: string[]) => reorderTopics(topic_ids), onSuccess: refresh })

  return { topics, create, update, reorder }
}

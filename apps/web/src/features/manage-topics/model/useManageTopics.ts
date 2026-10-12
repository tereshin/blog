import { articleKeys } from '@/entities/article'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { seoKeys } from '@/entities/seo'
import { getAllTopics, topicKeys } from '@/entities/topic'
import { createTopic, reorderTopics, updateTopic } from '../api/manage-topics.ts'
import type { TopicDraft } from '../api/manage-topics.ts'

export function useManageTopics() {
  const query_client = useQueryClient()
  const topics = useQuery({
    queryKey: topicKeys.admin(),
    queryFn: ({ signal }) => getAllTopics(signal),
  })

  const refresh = () => {
    void Promise.all([
      query_client.invalidateQueries({ queryKey: topicKeys.all }),
      query_client.invalidateQueries({ queryKey: seoKeys.all }),
      query_client.invalidateQueries({ queryKey: articleKeys.all }),
    ])
  }

  const create = useMutation({
    mutationFn: (input: TopicDraft) => createTopic(input),
    onSuccess: refresh,
  })
  const update = useMutation({
    mutationFn: (input: {
      id: string
      body: Partial<TopicDraft> & { status?: 'active' | 'archived' }
    }) => updateTopic(input.id, input.body),
    onSuccess: refresh,
  })
  const reorder = useMutation({
    mutationFn: (topic_ids: string[]) => reorderTopics(topic_ids),
    onSuccess: refresh,
  })

  const move = (id: string, direction: -1 | 1) => {
    const items = topics.data ?? []
    const index = items.findIndex((topic) => topic.id === id)
    const next = index + direction
    if (reorder.isPending || index < 0 || next < 0 || next >= items.length) return
    const ids = items.map((topic) => topic.id)
    const [moved] = ids.splice(index, 1)
    if (!moved) return
    ids.splice(next, 0, moved)
    reorder.mutate(ids)
  }
  return { topics, create, update, reorder, move }
}

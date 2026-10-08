import { z } from 'zod'
import { http } from '@/shared/api'
import { topicDtoSchema, toTopic } from '@/entities/topic'
import type { Topic } from '@/entities/topic'

export type TopicDraft = {
  title: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string
}

export async function createTopic(body: TopicDraft): Promise<Topic> {
  return toTopic(await http.post('/v1/topics', topicDtoSchema, { body }))
}

export async function updateTopic(id: string, body: Partial<TopicDraft> & { status?: 'active' | 'archived' }): Promise<Topic> {
  return toTopic(await http.patch(`/v1/topics/${id}`, topicDtoSchema, { body }))
}

export async function reorderTopics(topic_ids: string[]): Promise<Topic[]> {
  return (await http.put('/v1/topics/order', z.array(topicDtoSchema), { body: { topic_ids } })).map(toTopic)
}

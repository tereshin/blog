import { http } from '@/shared/api'
import { topicDtoSchema, toTopic } from './topic-schema.ts'
import type { Topic } from './topic-schema.ts'

/** Одна тема по адресу; архивная тоже открывается. */
export async function getTopic(slug: string, signal?: AbortSignal): Promise<Topic> {
  return toTopic(await http.get(`/v1/topics/${encodeURIComponent(slug)}`, topicDtoSchema, { signal }))
}

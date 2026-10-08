import { http } from '@/shared/api'
import { topicListDtoSchema, toTopic } from './topic-schema.ts'
import type { Topic } from './topic-schema.ts'

/** Активные темы площадки в порядке `position`. */
export async function getTopics(signal?: AbortSignal): Promise<Topic[]> {
  return (await http.get('/v1/topics', topicListDtoSchema, { signal })).map(toTopic)
}

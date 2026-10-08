import { z } from 'zod'
import type { ServiceClient } from '@blog/http-kit'
import type { AccessChecker } from './events.types.ts'

const accessSchema = z.object({
  can_read: z.boolean(),
  visibility: z.enum(['public', 'members', 'author']),
  status: z.enum(['draft', 'published', 'hidden', 'deleted']),
  author_id: z.uuid(),
})

/** Решение о доступе принимает владелец статьи: `GET {CONTENT_URL}/internal/articles/{id}/access`. */
export function createContentAccessChecker(content: ServiceClient): AccessChecker {
  return async (viewer_jwt, article_id) => {
    const response = await content.request({ path: `/internal/articles/${article_id}/access`, service_context: viewer_jwt })
    if (response.status === 404) return null
    if (response.status !== 200) throw new Error(`content: неожиданный ответ ${response.status}`)
    return accessSchema.parse(response.body)
  }
}

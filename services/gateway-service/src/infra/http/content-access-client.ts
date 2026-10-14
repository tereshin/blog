import { z } from 'zod'
import type { ServiceClient } from '@blog/http-kit'
import type { ArticleAccess, ArticleAccessPort } from '../../modules/events/index.ts'

const ArticleAccessSchema = z.object({
  can_read: z.boolean(),
  visibility: z.enum(['public', 'members', 'author']),
  status: z.enum(['draft', 'published', 'hidden', 'deleted']),
  author_id: z.uuid(),
})

/** Решение о доступе принимает владелец статьи: `GET {CONTENT_URL}/internal/articles/{id}/access`. */
export class ContentAccessClient implements ArticleAccessPort {
  constructor(private readonly content: ServiceClient) {}

  async check(viewer_jwt: string, article_id: string): Promise<ArticleAccess | null> {
    const response = await this.content.request({ path: `/internal/articles/${article_id}/access`, service_context: viewer_jwt })
    if (response.status === 404) return null
    if (response.status !== 200) throw new Error(`content: неожиданный ответ ${response.status}`)
    return ArticleAccessSchema.parse(response.body)
  }
}

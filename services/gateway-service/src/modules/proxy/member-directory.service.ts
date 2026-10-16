import { z } from 'zod'
import {
  adminDirectoryQuerySchema,
  adminDirectorySchema,
  adminUserPageSchema,
} from '@blog/contracts'
import { ServiceUnavailableError } from '@blog/http-kit'
import type { ServiceClient } from '@blog/http-kit'

export class MemberDirectoryService {
  constructor(
    private readonly identity: ServiceClient,
    private readonly content: ServiceClient,
  ) {}
  async list(input: unknown, service_context: string, correlation_id: string) {
    const query = adminDirectoryQuerySchema.omit({ ids: true }).parse(input)
    const limit = Math.min(query.limit, 100)
    const context = { service_context, correlation_id }
    async function get<T>(
      client: ServiceClient,
      name: string,
      path: string,
      schema: z.ZodType<T>,
    ): Promise<T> {
      const response = await client.request({ ...context, path })
      if (response.status !== 200) throw new ServiceUnavailableError(name)
      return schema.parse(response.body)
    }
    const items: z.infer<typeof adminUserPageSchema>['items'] = []
    let cursor = query.cursor
    let has_more = false
    // A deleted identity can still have published content and a profile. Scan bounded
    // name windows so these records cannot hide later matching accounts or emails.
    while (items.length <= limit) {
      const params = new URLSearchParams({ q: query.q, cursor: String(cursor), limit: '101' })
      const candidates = query.q
        ? await get(
            this.content,
            'content',
            `/internal/admin/profiles?${params}`,
            adminDirectorySchema,
          )
        : []
      const through = candidates.length === 101 ? candidates.at(-1)?.public_number : undefined
      params.set('limit', String(limit))
      if (query.role) params.set('role', query.role)
      if (candidates.length)
        params.set('name_ids', candidates.map((item) => item.user_id).join(','))
      if (through) params.set('through', String(through))
      const part = await get(this.identity, 'identity', `/v1/users?${params}`, adminUserPageSchema)
      items.push(...part.items)
      if (part.next_cursor) {
        // Enough results exist to return this page without scanning further windows.
        if (items.length >= limit) {
          has_more = true
          break
        }
        cursor = Number(part.next_cursor)
      } else if (through) cursor = through
      else break
    }
    const page_items = items.slice(0, limit)
    const last = page_items.at(-1)
    const page = {
      items: page_items,
      next_cursor: last && (has_more || items.length > limit) ? String(last.public_number) : null,
    }
    const profiles = page.items.length
      ? await get(
          this.content,
          'content',
          `/internal/admin/profiles?ids=${page.items.map((item) => item.id).join(',')}&limit=101`,
          adminDirectorySchema,
        )
      : []
    const by_id = new Map(profiles.map((item) => [item.user_id, item]))
    return {
      ...page,
      items: page.items.map((item) => ({
        ...item,
        display_name: by_id.get(item.id)?.display_name ?? '',
        slug: by_id.get(item.id)?.slug ?? null,
      })),
    }
  }
}

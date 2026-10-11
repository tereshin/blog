import { z } from 'zod'
import { pageSeoSchema } from '@blog/contracts'
import type { PageSeo } from '@blog/contracts'
import { ServiceUnavailableError } from '@blog/http-kit'
import type { ServiceClient } from '@blog/http-kit'
import { NotFoundError } from '@blog/errors'

const documentSchema = z.strictObject({ content_type: z.enum(['text/plain', 'application/xml']), body: z.string() })

export function createPrerenderService(content: ServiceClient) {
  return {
    async load(path: string): Promise<PageSeo> {
      const response = await content.request({ path: `/internal/seo/page?path=${encodeURIComponent(path)}` })
      const parsed = pageSeoSchema.safeParse(response.body)
      if (response.status !== 200 || !parsed.success) throw new ServiceUnavailableError('content')
      return parsed.data
    },
    async document(kind: 'robots' | 'sitemap', part?: string): Promise<z.infer<typeof documentSchema>> {
      const response = await content.request({ path: `/internal/seo/${kind}${part ? `?part=${encodeURIComponent(part)}` : ''}` })
      if (response.status === 404) throw new NotFoundError()
      const parsed = documentSchema.safeParse(response.body)
      if (response.status !== 200 || !parsed.success) throw new ServiceUnavailableError('content')
      return parsed.data
    },
  }
}

import { z } from 'zod'
import type { ServiceClient } from '@blog/http-kit'
import type { PrerenderPage } from './html-template.ts'

const pageSchema = z.object({
  title: z.string(),
  description: z.string(),
  image_url: z.string().nullable(),
  type: z.enum(['article', 'topic', 'profile', 'website']),
  text: z.string(),
})

const NEUTRAL: PrerenderPage = { title: 'Блог', description: '', image_url: null, type: 'website', text: '' }

export function createPrerenderService(content: ServiceClient) {
  return {
    async load(kind: 'article' | 'topic' | 'profile' | 'site', slug: string): Promise<PrerenderPage> {
      const response = await content.request({ path: `/internal/prerender/${kind}/${encodeURIComponent(slug)}` })
      if (response.status !== 200) return NEUTRAL
      const parsed = pageSchema.safeParse(response.body)
      return parsed.success ? parsed.data : NEUTRAL
    },
  }
}

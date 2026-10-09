import { canReadArticle } from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'
import type { PrerenderRepository } from './prerender.repository.ts'

const GUEST: ServiceContext = { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:prerender' }

export type PrerenderPage = {
  title: string
  description: string
  image_url: string | null
  type: 'article' | 'topic' | 'profile' | 'website'
  text: string
}

function blockText(blocks: unknown): string {
  if (!blocks || typeof blocks !== 'object' || !('blocks' in blocks)) return ''
  const list = (blocks as { blocks: unknown }).blocks
  if (!Array.isArray(list)) return ''
  return list
    .map((block) => {
      if (!block || typeof block !== 'object' || !('data' in block)) return ''
      const data = (block as { data: unknown }).data
      if (!data || typeof data !== 'object' || !('text' in data)) return ''
      const text = (data as { text: unknown }).text
      return typeof text === 'string' ? text : ''
    })
    .filter((line) => line.length > 0)
    .join('\n')
}

/** Страница для робота. Черновик, скрытая и непубличная статья отдают только название площадки. */
export function createPrerenderService(repository: PrerenderRepository) {
  return {
    async page(kind: 'article' | 'topic' | 'profile' | 'site', slug: string): Promise<PrerenderPage> {
      const site = (await repository.site()) ?? { name: 'Блог', about: '', logo_url: null }
      const neutral: PrerenderPage = { title: site.name, description: site.about, image_url: site.logo_url, type: 'website', text: '' }
      if (kind === 'site') return neutral
      if (kind === 'article') {
        const article = await repository.article(slug)
        if (!article || !canReadArticle(GUEST, article)) return neutral
        return {
          title: article.title,
          description: article.excerpt,
          image_url: article.first_image_url,
          type: 'article',
          text: blockText(article.blocks),
        }
      }
      if (kind === 'topic') {
        const topic = await repository.topic(slug)
        if (!topic) return neutral
        return { title: topic.title, description: topic.description ?? '', image_url: topic.cover_url, type: 'website', text: '' }
      }
      const profile = await repository.profile(slug)
      if (!profile) return neutral
      return { title: profile.display_name, description: profile.bio ?? '', image_url: profile.avatar_url, type: 'profile', text: '' }
    },
  }
}

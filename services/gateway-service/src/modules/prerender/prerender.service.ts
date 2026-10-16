import { pageSeoSchema } from '@blog/contracts'
import type { PageSeo } from '@blog/contracts'
import { ServiceUnavailableError } from '@blog/http-kit'
import type { ServiceClient } from '@blog/http-kit'
import { NotFoundError } from '@blog/errors'
import { renderApplicationHtml, renderPrerenderHtml } from './html-template.ts'
import { SeoDocumentSchema } from './prerender.schema.ts'
import type { SeoDocument } from './prerender.schema.ts'

export type PrerenderedPage = {
  status: number
  html: string
  /** Значение `X-Robots-Tag`; `null` — заголовок не нужен. */
  robots_tag: string | null
}

export class PrerenderService {
  constructor(
    private readonly content: ServiceClient,
    private readonly web?: ServiceClient,
  ) {}

  async load(path: string): Promise<PageSeo> {
    const response = await this.content.request({
      path: `/internal/seo/page?path=${encodeURIComponent(path)}`,
    })
    const parsed = pageSeoSchema.safeParse(response.body)
    if (response.status !== 200 || !parsed.success) throw new ServiceUnavailableError('content')
    return parsed.data
  }

  async document(kind: 'robots' | 'sitemap', part?: string): Promise<SeoDocument> {
    const response = await this.content.request({
      path: `/internal/seo/${kind}${part ? `?part=${encodeURIComponent(part)}` : ''}`,
    })
    if (response.status === 404) throw new NotFoundError()
    const parsed = SeoDocumentSchema.safeParse(response.body)
    if (response.status !== 200 || !parsed.success) throw new ServiceUnavailableError('content')
    return parsed.data
  }

  /** Public HTML is identical for crawlers and browsers; React replaces the initial root. */
  async renderPage(
    _user_agent: string | undefined,
    url: string,
    nonce: string,
  ): Promise<PrerenderedPage> {
    const page = await this.load(url)
    let html = renderPrerenderHtml(page, nonce)
    if (this.web) {
      const response = await this.web.request({ path: '/index.html' })
      if (response.status !== 200 || typeof response.body !== 'string')
        throw new ServiceUnavailableError('web')
      html = renderApplicationHtml(page, response.body, nonce)
    }
    return {
      status: page.status,
      html,
      robots_tag: page.robots.startsWith('noindex') ? page.robots : null,
    }
  }
}

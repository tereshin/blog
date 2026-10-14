import { createHash } from 'node:crypto'
import { SocialCoverGeneratedV1, socialCoverSettingsSchema } from '@blog/contracts'
import type { SocialCoverInput } from '@blog/contracts'
import type { CoverArticle, SocialCoverRepositoryPort } from './social-cover.types.ts'

const AUTHOR_BATCH_SIZE = 100

/** Version the complete rendering input, never the article slug or a wall clock. */
export function coverRevision(input: SocialCoverInput): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

export class SocialCoverService<TTx> {
  constructor(private readonly repository: SocialCoverRepositoryPort<TTx>) {}

  async requestSiteCover(tx: TTx, correlation_id: string): Promise<void> {
    await this.request(tx, 'site', await this.siteInput(tx), correlation_id)
  }

  async invalidateArticleCover(tx: TTx, article_id: string): Promise<void> {
    await this.repository.remove(tx, article_id)
  }

  async requestArticleCover(tx: TTx, article_id: string, correlation_id: string): Promise<void> {
    const article = await this.repository.findArticle(tx, article_id)
    if (!article || article.status !== 'published' || article.visibility !== 'public') {
      await this.invalidateArticleCover(tx, article_id)
      return
    }
    await this.request(tx, article.id, this.articleInput(await this.siteInput(tx), article), correlation_id)
  }

  /** Only previously requested covers participate: no historical article backfill. */
  async requestAuthorCovers(tx: TTx, author_id: string, correlation_id: string): Promise<void> {
    const site = await this.siteInput(tx)
    let cursor: string | undefined
    for (;;) {
      const batch = await this.repository.listCoveredByAuthor(tx, author_id, cursor, AUTHOR_BATCH_SIZE)
      if (batch.length === 0) return
      for (const article of batch) await this.request(tx, article.id, this.articleInput(site, article), correlation_id)
      cursor = batch.at(-1)?.id
    }
  }

  async applyGenerated(tx: TTx, event: unknown): Promise<void> {
    await this.repository.applyGenerated(tx, SocialCoverGeneratedV1.parse(event))
  }

  private async request(tx: TTx, target_id: string, input: SocialCoverInput, correlation_id: string): Promise<void> {
    const revision = coverRevision(input)
    if (!(await this.repository.saveRequest(tx, target_id, revision))) return
    await this.repository.appendRequested(tx, { target_id, revision, input, correlation_id })
  }

  private async siteInput(tx: TTx): Promise<SocialCoverInput> {
    const site = await this.repository.findSite(tx)
    const cover_settings = socialCoverSettingsSchema.parse(site?.social_cover ?? {})
    return {
      title: site?.name || 'Блог', site_name: site?.name || 'Блог', author_name: null, image_url: null,
      settings: { ...cover_settings, logo_url: cover_settings.logo_url ?? site?.logo_url ?? null },
    }
  }

  private articleInput(site: SocialCoverInput, article: CoverArticle): SocialCoverInput {
    return { ...site, title: article.title, author_name: article.author_name ?? 'Автор', image_url: article.first_image_url }
  }
}

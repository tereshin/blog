import type { ArticleSnapshotEvent, CopiesRepositoryPort, UserCopyPatch } from './copies.types.ts'

export class CopiesService<TTx> {
  constructor(private readonly repository: CopiesRepositoryPort<TTx>) {}

  applyArticle(tx: TTx, event: ArticleSnapshotEvent): Promise<void> {
    return this.repository.upsertArticle(tx, {
      article_id: event.article_id,
      author_id: event.author_id,
      title: event.title,
      slug: event.slug,
      visibility: event.visibility,
      status: event.status,
      comments_enabled: event.comments_enabled,
      published_at: event.published_at ? new Date(event.published_at) : null,
    })
  }

  applyUser(tx: TTx, patch: UserCopyPatch): Promise<void> {
    return this.repository.upsertUser(tx, patch)
  }
}

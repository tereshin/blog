import { canReadArticle } from '../../shared/can-read.ts'
import type { ViewCount } from '@blog/contracts'
import { ViewArticleNotFoundError } from './view.errors.ts'
import type { ArticleCountersPort, RecordViewInput, ViewEventsPort, ViewRepositoryPort } from './view.types.ts'

export class ViewService<TTx> {
  constructor(
    private readonly repository: ViewRepositoryPort<TTx>,
    private readonly counters: ArticleCountersPort<TTx>,
    private readonly events: ViewEventsPort<TTx>,
  ) {}

  async record(input: RecordViewInput): Promise<ViewCount> {
    const article = await this.repository.findArticle(input.article_id)
    if (!article || !canReadArticle(input.viewer, article)) throw new ViewArticleNotFoundError()
    const is_author = input.viewer.user_id !== undefined && input.viewer.user_id === article.author_id
    const is_moderation = input.context === 'moderation' && (input.viewer.role === 'admin' || input.viewer.role === 'superadmin')
    if (is_author || is_moderation) {
      return { counted: false, view_count: await this.repository.readCount(input.article_id) }
    }
    return this.repository.transaction(async (tx) => {
      const is_counted = await this.repository.countView(tx, { article_id: input.article_id, viewer_key: input.viewer.viewer_key })
      const snapshot = await this.counters.loadCounters(tx, input.article_id)
      if (is_counted) {
        await this.events.appendViewCounted(tx, { correlation_id: input.correlation_id, occurred_at: new Date().toISOString(), snapshot })
      }
      return { counted: is_counted, view_count: snapshot.view_count }
    })
  }
}

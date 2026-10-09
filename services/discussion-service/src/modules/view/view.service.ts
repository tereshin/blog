import { canReadArticle } from '@blog/contracts'
import type { ServiceContext, ViewCount } from '@blog/contracts'
import { ViewArticleNotFoundError } from './view.errors.ts'
import type { ViewRepository } from './view.repository.ts'

export type RecordViewInput = {
  viewer: ServiceContext
  article_id: string
  context?: 'moderation' | undefined
  correlation_id: string
}

export type ViewService = {
  record: (input: RecordViewInput) => Promise<ViewCount>
}

export function createViewService(repository: ViewRepository): ViewService {
  return {
    async record(input) {
      const article = await repository.findArticle(input.article_id)
      if (!article || !canReadArticle(input.viewer, article)) throw new ViewArticleNotFoundError()
      const is_author = input.viewer.user_id !== undefined && input.viewer.user_id === article.author_id
      const is_moderation = input.context === 'moderation' && (input.viewer.role === 'admin' || input.viewer.role === 'superadmin')
      if (is_author || is_moderation) {
        return { counted: false, view_count: await repository.readCount(input.article_id) }
      }
      return repository.record({
        article_id: input.article_id,
        viewer_key: input.viewer.viewer_key,
        correlation_id: input.correlation_id,
      })
    },
  }
}

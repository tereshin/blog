import { SEEN_LIMIT } from './seen.types.ts'
import type { SeenRepository, SeenService } from './seen.types.ts'

export function createSeenService(repository: SeenRepository): SeenService {
  return {
    async mark(viewer, input) {
      await repository.upsert({ viewer_key: viewer.viewer_key, feed_key: input.feed_key, article_id: input.article_id })
      return input
    },
    async list(viewer, feed_key) {
      const article_ids = await repository.list(viewer.viewer_key, feed_key, SEEN_LIMIT)
      return { article_ids }
    },
  }
}

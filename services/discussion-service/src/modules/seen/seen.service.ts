import type { FeedSeen, FeedSeenList, ServiceContext } from '@blog/contracts'
import { SEEN_LIMIT } from './seen.schema.ts'
import type { SeenRepositoryPort } from './seen.types.ts'

export class SeenService {
  constructor(private readonly repository: SeenRepositoryPort) {}

  async mark(viewer: ServiceContext, input: FeedSeen): Promise<FeedSeen> {
    await this.repository.upsert({ viewer_key: viewer.viewer_key, feed_key: input.feed_key, article_id: input.article_id })
    return input
  }

  async list(viewer: ServiceContext, feed_key: string): Promise<FeedSeenList> {
    const article_ids = await this.repository.list(viewer.viewer_key, feed_key, SEEN_LIMIT)
    return { article_ids }
  }
}

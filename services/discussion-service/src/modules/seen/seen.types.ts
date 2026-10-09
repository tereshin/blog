import type { FeedSeen, FeedSeenList, ServiceContext } from '@blog/contracts'

export const SEEN_LIMIT = 500

export type SeenRepository = {
  upsert: (input: { viewer_key: string; feed_key: string; article_id: string }) => Promise<void>
  list: (viewer_key: string, feed_key: string, limit: number) => Promise<string[]>
}

export type SeenService = {
  mark: (viewer: ServiceContext, input: FeedSeen) => Promise<FeedSeen>
  list: (viewer: ServiceContext, feed_key: string) => Promise<FeedSeenList>
}

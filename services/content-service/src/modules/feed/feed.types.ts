import type { ServiceContext } from '@blog/contracts'
import type { FeedCursor } from './feed.cursor.ts'

export type FeedRow = {
  id: string
  slug: string
  title: string
  excerpt: string
  first_image_url: string | null
  published_at: Date
  author_id: string
  author_display_name: string | null
  author_avatar_url: string | null
  author_slug: string | null
  author_public_number: number | null
  topic_id: string
  topic_title: string
  topic_slug: string
  topic_status: 'active' | 'archived'
  reaction_counts: unknown
  reaction_count: number
  comment_count: number
  bookmark_count: number
  view_count: number
  top_comment: unknown
  visibility: 'public' | 'members' | 'author'
  comments_enabled: boolean
}

export type FeedFollows = { user_ids: string[]; topic_ids: string[] }

export type FeedSelection =
  | { kind: 'fresh'; topic_slug?: string; cursor: Extract<FeedCursor, { k: 'time' }> | null }
  | { kind: 'popular'; cursor: Extract<FeedCursor, { k: 'score' }> | null }
  | ({ kind: 'mine'; cursor: Extract<FeedCursor, { k: 'time' }> | null } & FeedFollows)

export type ProfileLite = { display_name: string; avatar_url: string | null }

export type FeedRepository = {
  /** Возвращает до `limit` строк в порядке ленты; `limit` уже включает запас на «есть ещё». */
  findPage: (input: { viewer: ServiceContext; selection: FeedSelection; limit: number; now: Date }) => Promise<FeedRow[]>
  findProfiles: (user_ids: string[]) => Promise<Map<string, ProfileLite>>
  /** Подписки зрителя: авторы и темы. Пустые списки — подписок нет. */
  listFollows: (user_id: string) => Promise<FeedFollows>
}

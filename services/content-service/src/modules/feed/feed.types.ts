import type { ServiceContext } from '@blog/contracts'
import type { FeedRow, ProfileLite } from '../../shared/feed-card.ts'
import type { FeedCursor } from './feed.cursor.ts'

export type { FeedRow, ProfileLite }

export type FeedFollows = { user_ids: string[]; topic_ids: string[] }

export type FeedSelection =
  | { kind: 'fresh'; topic_slug?: string; cursor: Extract<FeedCursor, { k: 'time' }> | null }
  | { kind: 'popular'; cursor: Extract<FeedCursor, { k: 'score' }> | null }
  | ({ kind: 'mine'; cursor: Extract<FeedCursor, { k: 'time' }> | null } & FeedFollows)

/** Порт хранилища ленты: сервис зависит от него, реализацию подставляет app.ts. */
export type FeedRepositoryPort = {
  /** Возвращает до `limit` строк в порядке ленты; `limit` уже включает запас на «есть ещё». */
  findPage: (input: { viewer: ServiceContext; selection: FeedSelection; limit: number; now: Date }) => Promise<FeedRow[]>
  findProfiles: (user_ids: string[]) => Promise<Map<string, ProfileLite>>
  /** Подписки зрителя: авторы и темы. Пустые списки — подписок нет. */
  listFollows: (user_id: string) => Promise<FeedFollows>
}

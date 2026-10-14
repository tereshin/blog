import type { ServiceContext, Topic, UserListItem } from '@blog/contracts'
import type { FeedRow } from '../../shared/feed-card.ts'
import type { SearchCursor } from './search.cursor.ts'

/** Порт хранилища поиска: сервис зависит от него, реализацию подставляет app.ts. */
export type SearchRepositoryPort = {
  findArticles: (input: {
    viewer: ServiceContext
    q: string
    cursor: SearchCursor | null
    limit: number
  }) => Promise<Array<FeedRow & { rank: number }>>
  findPeople: (q: string) => Promise<UserListItem[]>
  findTopics: (q: string) => Promise<Topic[]>
}

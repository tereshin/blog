import type { SearchResponse, ServiceContext } from '@blog/contracts'
import { toFeedCard } from '../../shared/feed-card.ts'
import { decodeSearchCursor, encodeSearchCursor } from './search.cursor.ts'
import type { SearchRepositoryPort } from './search.types.ts'
import type { SearchQuery } from './search.schema.ts'

export class SearchService {
  constructor(private readonly repository: SearchRepositoryPort) {}

  async search(viewer: ServiceContext, query: SearchQuery): Promise<SearchResponse> {
    const cursor = query.cursor ? decodeSearchCursor(query.cursor) : null
    const [article_rows, people, topics] = await Promise.all([
      this.repository.findArticles({ viewer, q: query.q, cursor, limit: query.limit + 1 }),
      cursor ? Promise.resolve([]) : this.repository.findPeople(query.q),
      cursor ? Promise.resolve([]) : this.repository.findTopics(query.q),
    ])
    const page = article_rows.slice(0, query.limit)
    const last = page.at(-1)
    const next_cursor =
      article_rows.length > query.limit && last
        ? encodeSearchCursor({ r: last.rank, t: last.published_at.toISOString(), id: last.id })
        : null
    return {
      articles: page.map((row) => toFeedCard(row, new Map())),
      people,
      topics,
      next_cursor,
    }
  }
}

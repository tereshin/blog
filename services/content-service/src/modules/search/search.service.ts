import type { SearchResponse, ServiceContext } from '@blog/contracts'
import { toFeedCard } from '../feed/feed.service.ts'
import { decodeSearchCursor, encodeSearchCursor } from './search.cursor.ts'
import type { SearchRepository } from './search.repository.ts'
import type { SearchQuery } from './search.schema.ts'

export type SearchService = {
  search: (viewer: ServiceContext, query: SearchQuery) => Promise<SearchResponse>
}

export function createSearchService(repository: SearchRepository): SearchService {
  return {
    async search(viewer, query) {
      const cursor = query.cursor ? decodeSearchCursor(query.cursor) : null
      const [article_rows, people, topics] = await Promise.all([
        repository.findArticles({ viewer, q: query.q, cursor, limit: query.limit + 1 }),
        cursor ? Promise.resolve([]) : repository.findPeople(query.q),
        cursor ? Promise.resolve([]) : repository.findTopics(query.q),
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
    },
  }
}

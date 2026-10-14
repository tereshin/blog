import type { FeedPage, ServiceContext } from '@blog/contracts'
import { UnauthorizedError } from '@blog/errors'
import { StoredTopCommentSchema, toFeedCard } from '../../shared/feed-card.ts'
import { decodeCursor, encodeCursor } from './feed.cursor.ts'
import { popularScore } from './feed.rules.ts'
import type { FeedQuery } from './feed.schema.ts'
import type { FeedRepositoryPort, FeedSelection } from './feed.types.ts'

function timeCursor(query: FeedQuery): Extract<FeedSelection, { kind: 'fresh' }>['cursor'] {
  const cursor = query.cursor ? decodeCursor(query.cursor) : null
  return cursor?.k === 'time' ? cursor : null
}

function selectionOf(query: FeedQuery): FeedSelection {
  const mode = query.mode
  if (mode === 'popular') {
    const cursor = query.cursor ? decodeCursor(query.cursor) : null
    return { kind: 'popular', cursor: cursor?.k === 'score' ? cursor : null }
  }
  const cursor = timeCursor(query)
  return mode === 'fresh' ? { kind: 'fresh', cursor } : { kind: 'fresh', topic_slug: mode.slice('topic:'.length), cursor }
}

export class FeedService {
  constructor(private readonly repository: FeedRepositoryPort) {}

  async getPage(viewer: ServiceContext, query: FeedQuery, now = new Date()): Promise<FeedPage> {
    let selection: FeedSelection
    if (query.mode === 'mine') {
      if (!viewer.user_id) throw new UnauthorizedError()
      const follows = await this.repository.listFollows(viewer.user_id)
      if (follows.user_ids.length === 0 && follows.topic_ids.length === 0) {
        return { items: [], next_cursor: null, reason: 'no_follows' }
      }
      selection = { kind: 'mine', ...follows, cursor: timeCursor(query) }
    } else {
      selection = selectionOf(query)
    }
    // Берём на одну строку больше: так видно, есть ли следующая порция, без отдельного запроса.
    const rows = await this.repository.findPage({ viewer, selection, limit: query.limit + 1, now })
    const page_rows = rows.slice(0, query.limit)
    const has_more = rows.length > query.limit

    const top_author_ids = page_rows.flatMap((row) => {
      const stored = StoredTopCommentSchema.safeParse(row.top_comment)
      return stored.success ? [stored.data.author_id] : []
    })
    const profiles_by_id = await this.repository.findProfiles([...new Set(top_author_ids)])

    const last = page_rows.at(-1)
    const next_cursor =
      has_more && last
        ? encodeCursor(
            selection.kind === 'popular'
              ? { k: 'score', s: popularScore(last), id: last.id }
              : { k: 'time', t: last.published_at.toISOString(), id: last.id },
          )
        : null
    return { items: page_rows.map((row) => toFeedCard(row, profiles_by_id)), next_cursor }
  }
}

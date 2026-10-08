import { http } from '@/shared/api'
import type { FeedMode, FeedPageModel } from '../model/article-types.ts'
import { feedPageDtoSchema, toFeedPage } from './feed-schema.ts'

type GetFeedInput = { mode: FeedMode; cursor?: string | undefined; signal?: AbortSignal | undefined }

/** Порция ленты: до 20 карточек и `next_cursor` для продолжения. */
export async function getFeed({ mode, cursor, signal }: GetFeedInput): Promise<FeedPageModel> {
  const page = await http.get('/v1/feed', feedPageDtoSchema, { query: { mode, cursor }, signal })
  return toFeedPage(page)
}

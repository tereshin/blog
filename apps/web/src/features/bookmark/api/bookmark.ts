import { z } from 'zod'
import { http } from '@/shared/api'

const bookmarkStateSchema = z.object({
  article_id: z.string(),
  bookmark_count: z.number(),
  is_bookmarked: z.boolean(),
})

export type BookmarkState = z.infer<typeof bookmarkStateSchema>

export function setBookmark(article_id: string, is_bookmarked: boolean): Promise<BookmarkState> {
  const path = `/v1/bookmarks/${article_id}`
  return is_bookmarked ? http.put(path, bookmarkStateSchema) : http.delete(path, bookmarkStateSchema)
}

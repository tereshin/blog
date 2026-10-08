import { z } from 'zod'

export const bookmarkStateSchema = z.strictObject({
  article_id: z.uuid(),
  bookmark_count: z.number().int().nonnegative(),
  is_bookmarked: z.boolean(),
})
export type BookmarkState = z.infer<typeof bookmarkStateSchema>

/** `GET /v1/bookmarks` — идентификаторы статей по убыванию времени закладки. */
export const bookmarkPageSchema = z.strictObject({
  article_ids: z.array(z.uuid()),
  next_cursor: z.string().nullable(),
})
export type BookmarkPage = z.infer<typeof bookmarkPageSchema>

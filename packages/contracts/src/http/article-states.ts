import { z } from 'zod'
import { reactionKindSchema } from './feed.ts'

const viewerStateSchema = z.strictObject({
  my_reaction: reactionKindSchema.nullable(),
  is_bookmarked: z.boolean(),
})

/** `GET /v1/me/article-states?article_ids=` — не больше 50 идентификаторов. */
export const articleStatesSchema = z.strictObject({
  states: z.record(z.string(), viewerStateSchema),
})
export type ArticleStates = z.infer<typeof articleStatesSchema>
export type ArticleViewerState = z.infer<typeof viewerStateSchema>

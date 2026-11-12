import { http } from '@/shared/api'
import { popularCommentListDtoSchema, toPopularComment } from './comment-schema.ts'
import type { PopularCommentModel } from './comment-schema.ts'

/** До 10 самых популярных комментариев доступных зрителю статей. */
export async function getPopularComments(signal?: AbortSignal): Promise<PopularCommentModel[]> {
  return (await http.get('/v1/comments/popular', popularCommentListDtoSchema, { signal })).map(
    toPopularComment,
  )
}

export async function getWidgetComments(query: import('@blog/contracts').CommentsWidget, signal?: AbortSignal) {
  return (await http.get('/v1/comments/widget', popularCommentListDtoSchema, { query, signal })).map(toPopularComment)
}

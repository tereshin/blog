import type { CommentNode } from './comment-types.ts'

export type CommentSort = 'best' | 'newest' | 'oldest'
export const COMMENT_SORTS: CommentSort[] = ['best', 'newest', 'oldest']

/** Сортируем только полученные комментарии; сервер пока листает корни по времени. */
export function sortComments(comments: readonly CommentNode[], sort: CommentSort): CommentNode[] {
  return [...comments].sort((a, b) => {
    if (sort === 'best' && a.reaction_count !== b.reaction_count)
      return b.reaction_count - a.reaction_count
    const by_time = Date.parse(a.created_at) - Date.parse(b.created_at)
    return (sort === 'newest' || sort === 'best' ? -by_time : by_time) || a.id.localeCompare(b.id)
  })
}

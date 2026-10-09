import type { InfiniteData } from '@tanstack/react-query'
import type { CommentNode, CommentPage } from '@/entities/comment'

export type CommentCache = InfiniteData<CommentPage, string | undefined>

export function emptyCache(comment: CommentNode): CommentCache {
  return { pages: [{ comments: [comment], next_cursor: null }], pageParams: [undefined] }
}

function mapNode(node: CommentNode, visit: (node: CommentNode) => CommentNode | null): CommentNode | null {
  const next = visit(node)
  if (!next) return null
  return { ...next, replies: next.replies.flatMap((reply) => {
    const mapped = mapNode(reply, visit)
    return mapped ? [mapped] : []
  }) }
}

export function mapComments(cache: CommentCache, visit: (node: CommentNode) => CommentNode | null): CommentCache {
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      comments: page.comments.flatMap((comment) => {
        const mapped = mapNode(comment, visit)
        return mapped ? [mapped] : []
      }),
    })),
  }
}

/** Кладёт новый комментарий в конец корней или внутрь ответов родителя. */
export function insertComment(cache: CommentCache, comment: CommentNode, parent_id: string | null): CommentCache {
  if (!parent_id) {
    const [first, ...rest] = cache.pages
    if (!first) return emptyCache(comment)
    return { ...cache, pages: [{ ...first, comments: [...first.comments, comment] }, ...rest] }
  }
  return mapComments(cache, (node) => (node.id === parent_id ? { ...node, replies: [...node.replies, comment] } : node))
}

export function replaceComment(cache: CommentCache, comment_id: string, next: CommentNode): CommentCache {
  return mapComments(cache, (node) =>
    node.id === comment_id ? { ...next, replies: next.replies.length > 0 ? next.replies : node.replies } : node,
  )
}

import { useLocation } from 'react-router'
import { useState } from 'react'
import type { CommentNode, CommentPlacement } from './comment-types.ts'
import type { CommentSort } from './sort-comments.ts'
import { sortComments } from './sort-comments.ts'
import { useReplies } from './useReplies.ts'

function containsAnchor(comments: CommentNode[], anchor_id: string): boolean {
  return comments.some(
    (comment) => comment.id === anchor_id || containsAnchor(comment.replies, anchor_id),
  )
}

export function useCommentItem(
  comment: CommentNode,
  article_id: string | undefined,
  anchor_id: string,
  placement: CommentPlacement,
) {
  const { key } = useLocation()
  const anchor_key = key + anchor_id
  const [expansion, setExpansion] = useState({ is_open: false, dismissed_anchor: '' })
  const is_expanded =
    expansion.is_open ||
    (anchor_key !== expansion.dismissed_anchor && containsAnchor(comment.replies, anchor_id))
  const setExpanded = (is_open: boolean) =>
    setExpansion({ is_open, dismissed_anchor: is_open ? '' : anchor_key })
  const [sort, setSort] = useState<CommentSort>('oldest')
  const query = useReplies(article_id, comment.id, sort, is_expanded && placement.root_id === null)
  const loaded = query.data?.pages.flatMap((page) => page.comments) ?? []
  const pinned = comment.replies.filter(
    (reply) => reply.id === anchor_id && !loaded.some((item) => item.id === reply.id),
  )
  const replies = article_id ? [...pinned, ...loaded] : sortComments(comment.replies, sort)

  return { is_expanded, setExpanded, sort, setSort, query, replies }
}

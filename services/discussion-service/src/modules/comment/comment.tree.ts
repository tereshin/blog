import type { Comment, ReactionCounts, ReactionKind } from '@blog/contracts'
import { REACTION_KINDS } from '@blog/contracts'

const ANONYMOUS_NAME = 'Участник'

export type CommentStatus = 'visible' | 'deleted' | 'hidden'

/** Строка комментария с именем автора из копии участника. */
export type CommentRow = {
  id: string
  author_id: string
  parent_id: string | null
  body: string
  status: CommentStatus
  edited_at: Date | null
  reaction_count: number
  reply_count: number
  created_at: Date
  author_name: string | null
  author_avatar_url: string | null
}

export function emptyCounts(): ReactionCounts {
  return { laugh: 0, heart: 0, thumb: 0, fire: 0 }
}

/** Удалённый и скрытый комментарий остаётся в дереве только если на него есть ответы. */
export function occupiesThread(row: Pick<CommentRow, 'status' | 'reply_count'>): boolean {
  return row.status === 'visible' || row.reply_count > 0
}

function countsOf(facts: ReadonlyMap<string, ReactionCounts>, id: string): ReactionCounts {
  return facts.get(id) ?? emptyCounts()
}

export function toCommentNode(
  row: CommentRow,
  facts: ReadonlyMap<string, ReactionCounts>,
  mine: ReadonlyMap<string, ReactionKind>,
  replies: Comment['replies'],
): Comment {
  const stub = row.status !== 'visible'
  return {
    id: row.id,
    author: {
      user_id: row.author_id,
      display_name: row.author_name ?? ANONYMOUS_NAME,
      avatar_url: row.author_avatar_url,
    },
    body: stub ? null : row.body,
    status: row.status,
    edited_at: row.edited_at ? row.edited_at.toISOString() : null,
    reaction_counts: countsOf(facts, row.id),
    reaction_count: REACTION_KINDS.reduce((sum, kind) => sum + countsOf(facts, row.id)[kind], 0),
    my_reaction: mine.get(row.id) ?? null,
    created_at: row.created_at.toISOString(),
    replies,
  }
}

/** Ответ в выдаче не содержит собственного списка ответов: вложенность глубже одного уровня не передаётся. */
export function toReplyNode(
  row: CommentRow,
  facts: ReadonlyMap<string, ReactionCounts>,
  mine: ReadonlyMap<string, ReactionKind>,
): Comment['replies'][number] {
  const node = toCommentNode(row, facts, mine, [])
  return {
    id: node.id,
    author: node.author,
    body: node.body,
    status: node.status,
    edited_at: node.edited_at,
    reaction_counts: node.reaction_counts,
    reaction_count: node.reaction_count,
    my_reaction: node.my_reaction,
    created_at: node.created_at,
  }
}

/** Собирает страницу корней: ответы лежат внутри своего корня, заглушка не отдаёт текст. */
export function assembleCommentTree(
  roots: readonly CommentRow[],
  replies: readonly CommentRow[],
  facts: ReadonlyMap<string, ReactionCounts>,
  mine: ReadonlyMap<string, ReactionKind>,
): Comment[] {
  const by_parent = new Map<string, CommentRow[]>()
  for (const reply of replies) {
    if (!reply.parent_id || !occupiesThread(reply)) continue
    const list = by_parent.get(reply.parent_id) ?? []
    list.push(reply)
    by_parent.set(reply.parent_id, list)
  }
  return roots.filter(occupiesThread).map((root) => {
    const children = (by_parent.get(root.id) ?? []).map((reply) => toReplyNode(reply, facts, mine))
    return toCommentNode(root, facts, mine, children)
  })
}

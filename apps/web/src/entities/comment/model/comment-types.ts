export type ReactionKind = 'laugh' | 'heart' | 'thumb' | 'fire'
export type ReactionCounts = Record<ReactionKind, number>

export type CommentStatus = 'visible' | 'deleted' | 'hidden' | 'pending'

export type CommentNode = {
  id: string
  author: { user_id: string; display_name: string; avatar_url: string | null }
  body: string | null
  status: CommentStatus
  edited_at: string | null
  reaction_counts: ReactionCounts
  reaction_count: number
  my_reaction: ReactionKind | null
  created_at: string
  time_label: string
  replies: CommentNode[]
}

export type CommentPage = { comments: CommentNode[]; next_cursor: string | null }

/** `root_id` задан у ответа: новый ответ цепляется к корню, а не ко второму уровню. */
export type CommentPlacement = { root_id: string | null }

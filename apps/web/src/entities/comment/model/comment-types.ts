export type ReactionKind = 'laugh' | 'heart' | 'thumb' | 'fire'
export type ReactionCounts = Record<ReactionKind, number>

export type CommentStatus = 'visible' | 'deleted' | 'hidden'

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

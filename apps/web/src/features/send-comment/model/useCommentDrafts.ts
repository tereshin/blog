import { useState } from 'react'
import { updateMentionRanges } from '../lib/comment-mentions.ts'
import type { CommentMentionRange } from '../lib/comment-mentions.ts'

type CommentDraft = { text: string; mention_ranges: CommentMentionRange[] }
const drafts = new Map<string, CommentDraft>()

function draftKey(article_id: string, parent_id: string | null): string {
  return `${article_id}:${parent_id ?? ''}`
}

/**
 * Черновик комментария живёт в памяти вкладки. Перечитывание статьи и обсуждения
 * не очищает его: форма читает ту же Map, а не ответ сервера.
 */
export function useCommentDrafts(
  article_id: string,
  parent_id: string | null,
): {
  text: string
  mention_ranges: CommentMentionRange[]
  update: (value: string, ranges?: CommentMentionRange[]) => void
  clear: () => void
} {
  const key = draftKey(article_id, parent_id)
  const [draft, setDraft] = useState<CommentDraft>(
    () => drafts.get(key) ?? { text: '', mention_ranges: [] },
  )

  return {
    ...draft,
    update: (value, ranges) => {
      const text = value.slice(0, 5000)
      const next = {
        text,
        mention_ranges: ranges ?? updateMentionRanges(draft.text, text, draft.mention_ranges),
      }
      drafts.set(key, next)
      setDraft(next)
    },
    clear: () => {
      drafts.delete(key)
      setDraft({ text: '', mention_ranges: [] })
    },
  }
}

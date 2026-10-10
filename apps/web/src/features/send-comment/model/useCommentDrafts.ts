import { useState } from 'react'

const drafts = new Map<string, string>()

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
  update: (value: string) => void
  clear: () => void
} {
  const key = draftKey(article_id, parent_id)
  const [text, setText] = useState(() => drafts.get(key) ?? '')

  return {
    text,
    update: (value) => {
      const next = value.slice(0, 5000)
      drafts.set(key, next)
      setText(next)
    },
    clear: () => {
      drafts.delete(key)
      setText('')
    },
  }
}

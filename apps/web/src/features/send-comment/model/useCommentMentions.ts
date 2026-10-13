import { editorSelection, setEditorSelection } from '../lib/comment-editor.ts'
import { useState } from 'react'
import type { RefObject } from 'react'
import { findMentionQuery, selectedMentions, updateMentionRanges } from '../lib/comment-mentions.ts'
import type { CommentMention } from '../lib/comment-mentions.ts'
import type { useCommentDrafts } from './useCommentDrafts.ts'
import { useCommentMentionSearch } from './useCommentMentionSearch.ts'

type CommentMentionsOptions = {
  draft: ReturnType<typeof useCommentDrafts>
  field_ref: RefObject<HTMLDivElement | null>
  author: CommentMention | undefined
  is_focused: boolean
  can_search: boolean
}

export function useCommentMentions({
  draft,
  field_ref,
  author,
  is_focused,
  can_search,
}: CommentMentionsOptions) {
  const [caret, setCaret] = useState(draft.text.length)
  const [is_dismissed, setDismissed] = useState(false)
  const [is_composing, setComposing] = useState(false)
  const active = findMentionQuery(draft.text, caret)
  const mentions = selectedMentions(draft.mention_ranges)
  const is_selected = draft.mention_ranges.some((range) => active?.start === range.start)
  const is_open =
    is_focused &&
    !is_dismissed &&
    !is_composing &&
    !is_selected &&
    Boolean(active) &&
    mentions.length < 10
  const query = useCommentMentionSearch(active?.search ?? '', is_open && can_search)
  const suggested_author =
    author &&
    (!active?.search ||
      [author.display_name, author.slug ?? ''].some((value) =>
        value.toLocaleLowerCase().includes(active.search.toLocaleLowerCase()),
      ))
      ? author
      : null
  const suggestions = [
    ...(suggested_author ? [suggested_author] : []),
    ...(query.data ?? []).filter((user) => user.user_id !== suggested_author?.user_id),
  ].slice(0, 10)

  const focusAt = (position: number) => {
    setCaret(position)
    requestAnimationFrame(() => {
      field_ref.current?.focus()
      setEditorSelection(field_ref.current, position)
    })
  }
  return {
    is_open,
    mentions,
    suggestions,
    query,
    dismiss: () => setDismissed(true),
    setComposing,
    updateCaret: (position: number) => {
      setCaret(position)
      setDismissed(false)
    },
    start: () => {
      const start = editorSelection(field_ref.current)?.start ?? draft.text.length
      const end = editorSelection(field_ref.current)?.end ?? start
      const existing = findMentionQuery(draft.text, start)
      if (existing) {
        setDismissed(false)
        focusAt(start)
        return
      }
      const token = start > 0 && !/\s/u.test(draft.text.charAt(start - 1)) ? ' @' : '@'
      const next = draft.text.slice(0, start) + token + draft.text.slice(end)
      if (next.length > 5000) return
      draft.update(next)
      setDismissed(false)
      focusAt(start + token.length)
    },
    select: (user: CommentMention) => {
      if (!active) return
      const token = `@${user.slug ?? user.display_name}`
      const next = draft.text.slice(0, active.start) + token + ' ' + draft.text.slice(active.end)
      if (next.length > 5000) return
      draft.update(next, [
        ...updateMentionRanges(draft.text, next, draft.mention_ranges),
        { start: active.start, end: active.start + token.length, user },
      ])
      setDismissed(true)
      focusAt(active.start + token.length + 1)
    },
  }
}

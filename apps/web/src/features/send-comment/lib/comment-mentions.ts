export type CommentMention = {
  user_id: string
  display_name: string
  avatar_url?: string | null
  slug?: string | null
}
export type CommentMentionRange = { start: number; end: number; user: CommentMention }

/** Only an @ token at the caret starts a search; email addresses are ordinary text. */
export function findMentionQuery(text: string, caret: number) {
  const match = /(?:^|\s)@([^\s@]{0,100})$/u.exec(text.slice(0, caret))
  const search = match?.[1]
  if (search === undefined) return null
  return { start: caret - search.length - 1, end: caret, search }
}

/** Keep selected identities attached to their text through insertions and deletions. */
export function updateMentionRanges(
  previous: string,
  next: string,
  ranges: CommentMentionRange[],
): CommentMentionRange[] {
  let start = 0
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++
  let old_end = previous.length
  let new_end = next.length
  while (old_end > start && new_end > start && previous[old_end - 1] === next[new_end - 1]) {
    old_end--
    new_end--
  }
  const shift = new_end - old_end
  return ranges.flatMap((range) => {
    const overlaps = range.end > start && range.start < old_end
    // A new @ before an existing @ may share the first character in the diff.
    // For a pure insertion/deletion, verify the complete shifted token before dropping it.
    if (overlaps && old_end !== start && new_end !== start) return []
    const updated =
      range.start >= old_end || overlaps
        ? { ...range, start: range.start + shift, end: range.end + shift }
        : range
    if (next.slice(updated.start, updated.end) !== `@${range.user.slug ?? range.user.display_name}`)
      return []
    if (updated.start > 0 && !/\s/u.test(next.charAt(updated.start - 1))) return []
    if (updated.end < next.length && /[\p{L}\p{N}_@]/u.test(next.charAt(updated.end))) return []
    return [updated]
  })
}

export function selectedMentions(ranges: CommentMentionRange[]) {
  const users = new Map(ranges.map(({ user }) => [user.user_id, user]))
  return [...users.values()].map(({ user_id, display_name }) => ({ user_id, display_name }))
}

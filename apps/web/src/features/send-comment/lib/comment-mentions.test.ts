import { describe, expect, it } from 'vitest'
import { findMentionQuery, selectedMentions, updateMentionRanges } from './comment-mentions.ts'
import type { CommentMentionRange } from './comment-mentions.ts'

const user = { user_id: 'author', display_name: 'Анна Авторова' }
const token = `@${user.display_name}`
const text = `Привет ${token} !`
const range: CommentMentionRange = { start: 7, end: 7 + token.length, user }
const ranges = [range]

describe('inline comment mentions', () => {
  it('opens at a standalone @ at the caret, including in the middle of text', () => {
    expect(findMentionQuery('@', 1)).toEqual({ start: 0, end: 1, search: '' })
    expect(findMentionQuery('Привет @Анна остальной текст', 12)).toEqual({
      start: 7,
      end: 12,
      search: 'Анна',
    })
    expect(findMentionQuery('mail@example.com', 16)).toBeNull()
    expect(findMentionQuery('@Анна\n', 6)).toBeNull()
  })
  it('moves an identity with edits before it, preserving Unicode offsets', () => {
    expect(updateMentionRanges(text, `🔥 ${text}`, ranges)).toEqual([
      { ...range, start: 10, end: 10 + token.length },
    ])
    expect(updateMentionRanges(text, `${token} !`, ranges)).toEqual([
      { ...range, start: 0, end: token.length },
    ])
  })
  it('keeps the identity when only surrounding comment text changes', () => {
    expect(updateMentionRanges(text, `${text} спасибо`, ranges)).toEqual(ranges)
    expect(updateMentionRanges(text, `Привет ${token}!`, ranges)).toEqual(ranges)
  })
  it('removes notification recipients when their mention is deleted, edited or joined to a word', () => {
    expect(updateMentionRanges(text, 'Привет !', ranges)).toEqual([])
    expect(updateMentionRanges(text, text.replace('Анна', 'Ан'), ranges)).toEqual([])
    expect(updateMentionRanges(text, text.replace(`${token} `, `${token}а `), ranges)).toEqual([])
    expect(updateMentionRanges(text, text.replace('Привет ', 'Привет'), ranges)).toEqual([])
  })
  it('deduplicates the same recipient while keeping separate occurrences', () => {
    expect(selectedMentions([...ranges, ...ranges])).toEqual([user])
    expect(selectedMentions([])).toEqual([])
  })
})

it('keeps a selected nickname independent of the display name', () => {
  const user = { user_id: 'seed', display_name: 'Автор', slug: 'seed-author-a' }
  const text = '@seed-author-a '
  const ranges = [{ start: 0, end: 14, user }]
  expect(updateMentionRanges(text, text + 'ответ', ranges)).toEqual(ranges)
  expect(updateMentionRanges(text, '@seed-author ', ranges)).toEqual([])
})

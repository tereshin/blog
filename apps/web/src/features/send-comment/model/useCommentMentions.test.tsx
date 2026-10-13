import { act, renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useCommentDrafts } from './useCommentDrafts.ts'
import { useCommentMentions } from './useCommentMentions.ts'

vi.mock('./useCommentMentionSearch.ts', () => ({
  useCommentMentionSearch: () => ({ data: [], isFetching: false, isError: false }),
}))
const author = { user_id: 'author', display_name: 'Анна Авторова', avatar_url: null }
const field_ref = createRef<HTMLDivElement>()
function mount(article_id: string) {
  return renderHook(() => {
    const draft = useCommentDrafts(article_id, null)
    const mention = useCommentMentions({
      draft,
      author,
      field_ref,
      is_focused: true,
      can_search: true,
    })
    return { draft, mention }
  })
}

describe('mention drafts and identities', () => {
  it('suggests the article author immediately and selects the identity into the text', () => {
    const { result } = mount('author-suggestion')
    act(() => result.current.mention.start())
    expect(result.current.draft.text).toBe('@')
    expect(result.current.mention.is_open).toBe(true)
    expect(result.current.mention.suggestions).toEqual([author])
    act(() => result.current.mention.select(author))
    expect(result.current.draft.text).toBe('@Анна Авторова ')
    expect(result.current.mention.mentions).toEqual([
      { user_id: author.user_id, display_name: author.display_name },
    ])
    expect(result.current.mention.is_open).toBe(false)
  })
  it('preserves selected identities on remount and removes them when the name is edited', () => {
    const first = mount('restored-mention-draft')
    act(() => first.result.current.mention.start())
    act(() => first.result.current.mention.select(author))
    first.unmount()
    const { result } = mount('restored-mention-draft')
    expect(result.current.draft.text).toBe('@Анна Авторова ')
    expect(result.current.mention.mentions).toHaveLength(1)
    act(() => result.current.draft.update('@Ан Авторова '))
    expect(result.current.mention.mentions).toEqual([])
  })
  it('keeps identities aligned when selecting a new mention before an existing one', () => {
    const { result } = mount('mentions-before-text')
    act(() => result.current.mention.start())
    act(() => result.current.mention.select(author))
    act(() => result.current.draft.update('@ @Анна Авторова '))
    act(() => result.current.mention.updateCaret(1))
    act(() => result.current.mention.select({ user_id: 'reader', display_name: 'Роман Читаев' }))
    expect(result.current.draft.text).toBe('@Роман Читаев  @Анна Авторова ')
    expect(result.current.mention.mentions.map((user) => user.user_id)).toEqual([
      'author',
      'reader',
    ])
    act(() => result.current.draft.update('@Роман Читаев  '))
    expect(result.current.mention.mentions.map((user) => user.user_id)).toEqual(['reader'])
  })
  it('dismisses suggestions and suppresses them while composing text', () => {
    const { result } = mount('mention-dismiss')
    act(() => result.current.mention.start())
    act(() => result.current.mention.dismiss())
    expect(result.current.mention.is_open).toBe(false)
    act(() => result.current.mention.updateCaret(1))
    expect(result.current.mention.is_open).toBe(true)
    act(() => result.current.mention.setComposing(true))
    expect(result.current.mention.is_open).toBe(false)
  })
})

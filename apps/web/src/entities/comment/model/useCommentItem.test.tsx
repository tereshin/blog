import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useNavigate } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import type { CommentNode } from './comment-types.ts'
import { useCommentItem } from './useCommentItem.ts'

vi.mock('./useReplies.ts', () => ({ useReplies: () => ({ data: undefined }) }))
afterEach(cleanup)
it('reopens a dismissed reply branch when navigating to the same anchor again', () => {
  const reply: CommentNode = {
    id: 'reply', author: { user_id: 'author', display_name: 'Author', avatar_url: null },
    body: 'Reply', status: 'visible', edited_at: null, reaction_counts: {}, reaction_count: 0,
    my_reaction: null, created_at: '2026-10-01T12:00:00Z', time_label: '', replies: [],
  }
  const root: CommentNode = { ...reply, id: 'root', replies: [reply] }
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={['/p/test#comment-reply']}>{children}</MemoryRouter>
  const { result } = renderHook(() => ({ item: useCommentItem(root, undefined, 'reply', { root_id: null }), navigate: useNavigate() }), { wrapper })
  expect(result.current.item.is_expanded).toBe(true)
  act(() => result.current.item.setExpanded(false))
  expect(result.current.item.is_expanded).toBe(false)
  act(() => { void result.current.navigate('/p/test#comment-reply') })
  expect(result.current.item.is_expanded).toBe(true)
})

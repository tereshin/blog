import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recordView } from '../api/record-view.ts'
import { useRecordView } from './useRecordView.ts'

const query_client = vi.hoisted(() => ({ setQueryData: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => query_client }))
vi.mock('../api/record-view.ts', () => ({ recordView: vi.fn() }))

const ARTICLE = { id: 'article-1', slug: 'first' }
const OTHER_ARTICLE = { id: 'article-2', slug: 'second' }

function Wrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(recordView).mockResolvedValue({ counted: true, view_count: 1 })
})
afterEach(cleanup)

describe('article visits', () => {
  it('records once in Strict Mode and does not recount when article data refreshes', async () => {
    const { rerender } = renderHook(({ article }) => useRecordView(article, false), {
      wrapper: Wrapper,
      initialProps: { article: ARTICLE },
    })
    await waitFor(() => expect(query_client.setQueryData).toHaveBeenCalledTimes(1))
    rerender({ article: { ...ARTICLE } })
    expect(recordView).toHaveBeenCalledTimes(1)
  })

  it('records each return to an article during client navigation and after remounting', async () => {
    const { rerender, unmount } = renderHook(({ article }) => useRecordView(article, false), {
      wrapper: Wrapper,
      initialProps: { article: ARTICLE },
    })
    rerender({ article: OTHER_ARTICLE })
    rerender({ article: ARTICLE })
    unmount()
    renderHook(() => useRecordView(ARTICLE, false), { wrapper: Wrapper })
    await waitFor(() => expect(query_client.setQueryData).toHaveBeenCalledTimes(4))
    expect(vi.mocked(recordView).mock.calls.map(([id]) => id)).toEqual([
      ARTICLE.id, OTHER_ARTICLE.id, ARTICLE.id, ARTICLE.id,
    ])
  })

  it('waits for an available article and records moderation visits', async () => {
    const { rerender } = renderHook(({ article }: { article: typeof ARTICLE | null }) => useRecordView(article, true), {
      wrapper: Wrapper,
      initialProps: { article: null as typeof ARTICLE | null },
    })
    expect(recordView).not.toHaveBeenCalled()
    rerender({ article: ARTICLE })
    await waitFor(() => expect(query_client.setQueryData).toHaveBeenCalledTimes(1))
    expect(recordView).toHaveBeenCalledExactlyOnceWith(ARTICLE.id, 'moderation')
  })
})

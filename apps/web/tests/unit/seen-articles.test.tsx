import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { seenKeys, useSeenArticles } from '../../src/widgets/feed/model/useSeenArticles.ts'

function setup(feed_key: string, seen_ids: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(seenKeys.list(feed_key), { article_ids: seen_ids })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return { client, wrapper: Wrapper }
}

beforeEach(() => sessionStorage.clear())
afterEach(cleanup)

describe('просмотренные статьи', () => {
  it('раскрывает всю просмотренную порцию в свежем, даже если полоса была закрыта', () => {
    sessionStorage.setItem('bannerDismissed:fresh', '1')
    const { wrapper } = setup('fresh', ['a', 'b'])
    const { result } = renderHook(() => useSeenArticles('fresh', ['a', 'b']), { wrapper })
    expect(result.current.is_revealed).toBe(true)
    expect(result.current.is_auto_revealed).toBe(true)
    expect(result.current.is_dismissed).toBe(true)
  })

  it('сохраняет раскрытие после подгрузки непросмотренных статей', () => {
    const { wrapper } = setup('fresh', ['a', 'b'])
    const { result, rerender } = renderHook(({ ids }) => useSeenArticles('fresh', ids), {
      wrapper,
      initialProps: { ids: ['a', 'b'] },
    })
    rerender({ ids: ['a', 'b', 'c'] })
    expect(result.current.is_revealed).toBe(true)
    expect(result.current.is_auto_revealed).toBe(true)
  })

  it('оставляет просмотренные скрытыми, пока есть непросмотренные статьи', () => {
    const { wrapper } = setup('fresh', ['a'])
    const { result } = renderHook(() => useSeenArticles('fresh', ['a', 'b']), { wrapper })
    expect(result.current.is_revealed).toBe(false)
    act(() => result.current.reveal())
    expect(result.current.is_revealed).toBe(true)
    expect(result.current.is_auto_revealed).toBe(false)
    act(() => result.current.dismiss())
    expect(result.current.is_revealed).toBe(false)
  })

  it('раскрывает статьи после получения истории просмотров', async () => {
    const { client, wrapper } = setup('fresh', [])
    const { result } = renderHook(() => useSeenArticles('fresh', ['a']), { wrapper })
    expect(result.current.is_revealed).toBe(false)
    act(() => {
      client.setQueryData(seenKeys.list('fresh'), { article_ids: ['a'] })
    })
    await waitFor(() => expect(result.current.is_revealed).toBe(true))
  })

  it('не раскрывает пустую ленту и другие режимы автоматически', () => {
    const { wrapper } = setup('popular', ['a'])
    const { result } = renderHook(() => useSeenArticles('popular'), { wrapper })
    expect(result.current.is_revealed).toBe(false)
  })

  it('сбрасывает автоматическое раскрытие при переходе в другой раздел', () => {
    const { client, wrapper } = setup('fresh', ['a'])
    client.setQueryData(seenKeys.list('popular'), { article_ids: ['a'] })
    const { result, rerender } = renderHook(({ feed_key, ids }) => useSeenArticles(feed_key, ids), {
      wrapper,
      initialProps: { feed_key: 'fresh', ids: ['a'] },
    })
    expect(result.current.is_revealed).toBe(true)
    rerender({ feed_key: 'popular', ids: [] })
    expect(result.current.is_revealed).toBe(false)
  })
})

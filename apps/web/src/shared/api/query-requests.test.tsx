import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createQueryClient, http } from '@/shared/api'

const responseSchema = z.object({ ok: z.boolean() })

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('query requests', () => {
  it('отправляет одно чтение при проверке эффектов StrictMode и переходе на новый экран', async () => {
    const fetch_mock = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ ok: true })))
    vi.stubGlobal('fetch', fetch_mock)
    const client = createQueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const usePage = (path: string) => useQuery({
      queryKey: ['page', path],
      queryFn: ({ signal }) => http.get(path, responseSchema, { signal }),
    })
    const first = renderHook(() => usePage('/v1/first'), { wrapper, reactStrictMode: true })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    expect(fetch_mock.mock.calls.map(([url]) => url)).toEqual(['/v1/first'])
    first.unmount()

    const second = renderHook(() => usePage('/v1/second'), { wrapper, reactStrictMode: true })
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))
    second.unmount()
    const back = renderHook(() => usePage('/v1/first'), { wrapper, reactStrictMode: true })
    await waitFor(() => expect(back.result.current.isSuccess).toBe(true))
    expect(fetch_mock.mock.calls.map(([url]) => url)).toEqual(['/v1/first', '/v1/second'])
    client.clear()
  })

  it('отменяет уже отправленный запрос при уходе с экрана', async () => {
    const fetch_mock = vi.fn().mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    }))
    vi.stubGlobal('fetch', fetch_mock)
    const client = createQueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const hook = renderHook(() => useQuery({
      queryKey: ['pending'],
      queryFn: ({ signal }) => http.get('/v1/pending', responseSchema, { signal }),
    }), { wrapper })
    await waitFor(() => expect(fetch_mock).toHaveBeenCalledTimes(1))
    const signal = (fetch_mock.mock.calls[0]?.[1] as RequestInit).signal
    expect(signal?.aborted).toBe(false)
    await act(async () => hook.unmount())
    expect(signal?.aborted).toBe(true)
    client.clear()
  })
})

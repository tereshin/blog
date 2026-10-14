import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '@/shared/api'
import { useFollow } from './useFollow.ts'
import { useFollowStates } from './useFollowStates.ts'
import { followKeys } from './follow-keys.ts'

const session = vi.hoisted(() => ({ status: 'member', user: { id: 'viewer' } }))
vi.mock('@/entities/session', () => ({ useViewer: () => ({ viewer: session }) }))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/ui', () => ({ useToast: () => ({ error: vi.fn() }) }))
const first_id = '00000000-0000-4000-8000-000000000001'
const second_id = '00000000-0000-4000-8000-000000000002'
const target = { target_type: 'user' as const, target_id: first_id, is_following: false }

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}
beforeEach(() => {
  session.status = 'member'
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('batched follow state', () => {
  it('loads authoritative state into the same flags observed by follow buttons', async () => {
    vi.spyOn(http, 'get').mockResolvedValue({ items: [{ ...target, is_following: true }] })
    const { wrapper } = setup()
    const { result } = renderHook(
      () => ({ states: useFollowStates([target]), follow: useFollow(target) }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.follow.is_following).toBe(true))
    expect(result.current.states.is_pending).toBe(false)
  })
  it('does not request states for guests', async () => {
    session.status = 'guest'
    const get = vi.spyOn(http, 'get')
    const { wrapper } = setup()
    const { result } = renderHook(() => useFollowStates([target]), { wrapper })
    expect(result.current.is_pending).toBe(false)
    expect(get).not.toHaveBeenCalled()
  })
  it('deduplicates targets and splits each type into batches of at most 100', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({ items: [] })
    const targets = Array.from({ length: 205 }, (_, index) => ({
      target_type: 'user' as const,
      target_id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    }))
    const { wrapper } = setup()
    const { result } = renderHook(
      () => useFollowStates([...targets, target, { target_type: 'topic', target_id: first_id }]),
      { wrapper },
    )
    await waitFor(() => expect(result.current.is_pending).toBe(false))
    expect(get).toHaveBeenCalledTimes(4)
    expect(
      get.mock.calls
        .map((call) => String(call[2]?.query?.['target_ids']).split(',').length)
        .sort((a, b) => a - b),
    ).toEqual([1, 5, 100, 100])
  })
  it('ignores a late read after the user has changed the subscription', async () => {
    let finish: (value: unknown) => void = () => {}
    vi.spyOn(http, 'get').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    vi.spyOn(http, 'put').mockResolvedValue({ ...target, is_following: true })
    const { wrapper } = setup()
    const { result } = renderHook(
      () => ({ states: useFollowStates([target]), follow: useFollow(target) }),
      { wrapper },
    )
    await waitFor(() => expect(http.get).toHaveBeenCalled())
    act(() => result.current.follow.toggle())
    await waitFor(() => expect(result.current.follow.is_following).toBe(true))
    await waitFor(() => expect(result.current.follow.is_pending).toBe(false))
    act(() => finish({ items: [{ ...target, is_following: false }] }))
    await waitFor(() => expect(result.current.states.is_pending).toBe(false))
    expect(result.current.follow.is_following).toBe(true)
  })
  it('rolls back only the failed target and retains a concurrent successful subscription', async () => {
    let reject_first: (reason: Error) => void = () => {}
    vi.spyOn(http, 'put').mockImplementation((_path, _schema, options) => {
      const body = options?.body as { target_id: string }
      return body.target_id === first_id
        ? new Promise((_resolve, reject) => {
            reject_first = reject
          })
        : Promise.resolve({ ...target, target_id: second_id, is_following: true })
    })
    const { wrapper, client } = setup()
    const { result } = renderHook(
      () => ({ first: useFollow(target), second: useFollow({ ...target, target_id: second_id }) }),
      { wrapper },
    )
    act(() => {
      result.current.first.toggle()
      result.current.second.toggle()
    })
    await waitFor(() => expect(result.current.second.is_following).toBe(true))
    await waitFor(() => expect(result.current.second.is_pending).toBe(false))
    act(() => reject_first(new Error('Failed')))
    await waitFor(() => expect(result.current.first.is_following).toBe(false))
    expect(client.getQueryData(followKeys.flag('user', second_id))).toBe(true)
  })
})

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cancelFeedReturn, saveFeedReturn } from '@/shared/lib/feed-return.ts'
import { useFeedReturn } from './useFeedReturn.ts'

const navigation = vi.hoisted(() => ({ type: 'POP', location: { key: 'feed-entry', pathname: '/', search: '', state: null as null | { feed_return_key: string } } }))
vi.mock('react-router', () => ({ useLocation: () => navigation.location, useNavigationType: () => navigation.type }))
const scroll = vi.fn()
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('scrollTo', scroll)
  sessionStorage.clear()
  cancelFeedReturn()
  navigation.type = 'POP'
  navigation.location = { key: 'feed-entry', pathname: '/', search: '', state: null }
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); scroll.mockClear() })

it('restores the matching ready feed once, even if data becomes pending again', () => {
  saveFeedReturn({ mode: 'fresh', feed_key: 'fresh', scroll_top: 850, entry_key: 'feed-entry' })
  const hook = renderHook(({ ready }) => useFeedReturn('fresh', 'fresh', ready), { initialProps: { ready: false } })
  act(() => { vi.advanceTimersByTime(32) })
  expect(scroll).not.toHaveBeenCalled()
  hook.rerender({ ready: true })
  act(() => { vi.advanceTimersByTime(32) })
  expect(scroll).toHaveBeenCalledWith({ top: 850, behavior: 'instant' })
  hook.rerender({ ready: false })
  hook.rerender({ ready: true })
  act(() => { vi.advanceTimersByTime(32) })
  expect(scroll).toHaveBeenCalledTimes(1)
})
it('does not restore another feed key or an ordinary menu navigation', () => {
  saveFeedReturn({ mode: 'fresh', feed_key: 'topic:other', scroll_top: 850, entry_key: 'feed-entry' })
  const hook = renderHook(() => useFeedReturn('fresh', 'fresh', true))
  act(() => { vi.advanceTimersByTime(32) })
  expect(scroll).not.toHaveBeenCalled()
  saveFeedReturn({ mode: 'fresh', feed_key: 'fresh', scroll_top: 850, entry_key: 'feed-entry' })
  navigation.type = 'PUSH'
  navigation.location = { ...navigation.location, key: 'new-entry' }
  hook.rerender()
  act(() => { vi.advanceTimersByTime(32) })
  expect(scroll).not.toHaveBeenCalled()
})
it('restores an explicit header Back and cancels a scheduled restoration on unmount', () => {
  saveFeedReturn({ mode: 'fresh', feed_key: 'fresh', scroll_top: 850, entry_key: 'feed-entry' })
  navigation.type = 'PUSH'
  navigation.location = { ...navigation.location, key: 'new-entry', state: { feed_return_key: 'feed-entry' } }
  const first = renderHook(() => useFeedReturn('fresh', 'fresh', true))
  first.unmount()
  act(() => { vi.advanceTimersByTime(32) })
  expect(scroll).not.toHaveBeenCalled()
  renderHook(() => useFeedReturn('fresh', 'fresh', true))
  act(() => { vi.advanceTimersByTime(32) })
  expect(scroll).toHaveBeenCalledTimes(1)
})

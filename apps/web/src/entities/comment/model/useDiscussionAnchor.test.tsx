import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiscussionAnchor } from './useDiscussionAnchor.ts'

let reduced = false
const scroll = vi.fn()
function setup(hash: string) {
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={['/p/test' + hash]}>{children}</MemoryRouter>
  return renderHook(() => { useDiscussionAnchor('article'); return useNavigate() }, { wrapper })
}
function appendTarget(id: string) {
  const element = document.createElement('article')
  element.id = id
  document.body.append(element)
  return element
}
beforeEach(() => {
  vi.useFakeTimers()
  reduced = false
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }))
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll })
})
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  scroll.mockClear()
})
async function flush() { await act(async () => { await vi.advanceTimersByTimeAsync(32) }) }

describe('discussion anchors', () => {
  it('waits for async targets, highlights for three seconds and ignores rerenders', async () => {
    const hook = setup('#comment-target')
    await flush()
    expect(scroll).not.toHaveBeenCalled()
    const target = appendTarget('comment-target')
    await flush()
    expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
    expect(target.dataset.commentHighlighted).toBe('true')
    hook.rerender()
    await flush()
    expect(scroll).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000) })
    expect(target.dataset.commentHighlighted).toBeUndefined()
  })
  it('repeats the same anchor on a new navigation and cleans up the old target', async () => {
    const target = appendTarget('comment-target')
    const hook = setup('#comment-target')
    await flush()
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000) })
    act(() => { void hook.result.current('/p/test#comment-target') })
    await flush()
    expect(scroll).toHaveBeenCalledTimes(2)
    expect(target.dataset.commentHighlighted).toBe('true')
    hook.unmount()
    expect(target.dataset.commentHighlighted).toBeUndefined()
  })
  it('respects reduced motion and does not highlight the discussion section', async () => {
    reduced = true
    const target = appendTarget('comments')
    setup('#comments')
    await flush()
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' })
    expect(target.dataset.commentHighlighted).toBeUndefined()
  })
  it('stops watching missing anchors after the deadline', async () => {
    setup('#comment-missing')
    await act(async () => { await vi.advanceTimersByTimeAsync(10_100) })
    appendTarget('comment-missing')
    await flush()
    expect(scroll).not.toHaveBeenCalled()
  })
})

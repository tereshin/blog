import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useShellLayout } from './useShellLayout.ts'

const location = vi.hoisted(() => ({ key: 'initial', pathname: '/' }))
vi.mock('react-router', () => ({ useLocation: () => location }))
const scroll = vi.fn()
beforeEach(() => {
  vi.stubGlobal('scrollTo', scroll)
  location.key = 'initial'
  location.pathname = '/'
  history.scrollRestoration = 'auto'
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); scroll.mockClear() })
it('disables browser restoration and resets new navigations, including the same section', () => {
  const hook = renderHook(() => useShellLayout('/'))
  expect(history.scrollRestoration).toBe('manual')
  location.key = 'same-section'
  hook.rerender()
  expect(scroll).toHaveBeenCalledTimes(2)
  expect(scroll).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' })
  hook.unmount()
  expect(history.scrollRestoration).toBe('auto')
})
it('preserves background scroll while opening and closing the editor overlay', () => {
  const hook = renderHook(() => useShellLayout('/'))
  scroll.mockClear()
  location.pathname = '/write'
  location.key = 'editor'
  hook.rerender()
  location.pathname = '/'
  location.key = 'return'
  hook.rerender()
  expect(scroll).not.toHaveBeenCalled()
})

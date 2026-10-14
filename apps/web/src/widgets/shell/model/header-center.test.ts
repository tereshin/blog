import { afterEach, describe, expect, it } from 'vitest'
import { useShellStore } from '@/widgets/shell'

describe('header center', () => {
  afterEach(() =>
    useShellStore.setState({
      header_center: { kind: 'empty' },
      previous_center: { kind: 'empty' },
    }),
  )

  it('retains the explicit destination across search and route changes', () => {
    const store = useShellStore.getState()
    store.setHeaderCenter({ kind: 'back', title: 'General', to: '/admin/settings' })
    store.openSearch()
    store.setHeaderCenter({ kind: 'back', title: 'Settings', to: '/admin' })
    expect(useShellStore.getState().header_center.kind).toBe('search')
    store.closeSearch()
    expect(useShellStore.getState().header_center).toEqual({
      kind: 'back',
      title: 'Settings',
      to: '/admin',
    })
  })
})

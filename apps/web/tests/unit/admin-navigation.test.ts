import { describe, expect, it, afterEach } from 'vitest'
import {
  ADMIN_ROUTES,
  getAdminChildren,
  getAdminParentPath,
  getAdminRoute,
  getModerationReturnTo,
} from '@/entities/admin'
import { useShellStore } from '@/widgets/shell'

describe('admin navigation', () => {
  afterEach(() =>
    useShellStore.setState({
      header_center: { kind: 'empty' },
      previous_center: { kind: 'empty' },
    }),
  )
  it('filters root categories by permissions without changing their order', () => {
    expect(getAdminChildren('home', true).map((route) => route.path)).toEqual([
      '/admin/moderation',
      '/admin/settings',
      '/admin/members',
      '/admin/topics',
      '/admin/pages',
      '/admin/sections',
    ])
    expect(getAdminChildren('home', false)).toEqual([ADMIN_ROUTES.moderation])
    expect(getAdminChildren('settings', false)).toEqual([])
    expect(getAdminChildren('moderation', false)).toHaveLength(4)
  })
  it('resolves parents, root return and trailing slashes', () => {
    expect(getAdminParentPath(ADMIN_ROUTES.home)).toBe('/')
    expect(getAdminParentPath(ADMIN_ROUTES.general)).toBe('/admin/settings')
    expect(getAdminParentPath(ADMIN_ROUTES.articles)).toBe('/admin/moderation')
    expect(getAdminRoute('/admin/settings/')).toEqual(ADMIN_ROUTES.settings)
    expect(getAdminRoute('/admin/unknown')).toBeUndefined()
  })
  it.each([
    null,
    undefined,
    {},
    { moderation_return_to: 'https://example.org' },
    { moderation_return_to: '/admin/settings/general' },
    { moderation_return_to: '/admin/moderation/unknown' },
  ])('rejects invalid article return state: %j', (state) => {
    expect(getModerationReturnTo(state)).toBe('/admin/moderation/articles')
  })
  it('accepts each actual moderation screen', () => {
    for (const route of getAdminChildren('moderation', true))
      expect(getModerationReturnTo({ moderation_return_to: route.path })).toBe(route.path)
  })
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

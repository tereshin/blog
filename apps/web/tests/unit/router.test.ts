import { isValidElement } from 'react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { shellRoute } from '@/app/routes/router'
import { ShellLayout } from '@/app/routes/ShellLayout.tsx'

/** 18 адресов таблицы `contracts/sections.md`. Панели в этот список не входят. */
const SECTIONS = [
  '/',
  '/popular',
  '/feed',
  '/t/:slug',
  '/p/:slug',
  '/u/:slug',
  '/u/:slug/followers',
  '/u/:slug/following',
  '/messages',
  '/rating',
  '/bookmarks',
  '/search',
  '/about',
  '/write',
  '/write/:id',
  '/admin/moderation',
  '/admin/topics',
  '/admin/settings',
]

function isLazy(element: ReactNode): boolean {
  if (!isValidElement(element)) return false
  const type = element.type as { $$typeof?: symbol }
  return typeof type === 'object' && type !== null && type.$$typeof === Symbol.for('react.lazy')
}

function pathOf(route: { index?: boolean; path?: string }): string {
  if (route.index) return '/'
  return `/${route.path ?? ''}`
}

describe('router', () => {
  it('ровно один родительский маршрут с каркасом', () => {
    expect(shellRoute.path).toBe('/')
    expect(isValidElement(shellRoute.element) && shellRoute.element.type).toBe(ShellLayout)
    expect(shellRoute.children?.some((route) => 'children' in route && route.children)).toBe(false)
  })

  it('все 18 адресов — ленивые дети каркаса', () => {
    const children = shellRoute.children ?? []
    const paths = children.map((route) => pathOf(route))
    expect(SECTIONS).toHaveLength(18)
    for (const path of SECTIONS) {
      const route = children.find((item) => pathOf(item) === path)
      expect(route, path).toBeDefined()
      expect(isLazy(route?.element), path).toBe(true)
    }
    expect(new Set(paths.filter((path) => SECTIONS.includes(path))).size).toBe(18)
  })
})

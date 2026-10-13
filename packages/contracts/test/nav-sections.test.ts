import { describe, expect, it } from 'vitest'
import {
  createNavSectionItemSchema,
  createNavSectionSchema,
  navSectionOrderSchema,
  toPublicNavSections,
} from '../src/http/nav-sections.ts'
import type { AdminNavSection } from '../src/http/nav-sections.ts'

const SECTION = '44444444-4444-4444-8444-444444444444'
const PAGE = '33333333-3333-4333-8333-333333333333'
const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>'

function item(
  id: string,
  target: AdminNavSection['items'][number]['target'],
): AdminNavSection['items'][number] {
  return { id, title: id.slice(0, 8), icon: ICON, position: 0, target }
}

describe('nav section contracts', () => {
  it('trims a section title and rejects an empty one', () => {
    expect(createNavSectionSchema.parse({ title: '  О площадке  ' })).toEqual({ title: 'О площадке' })
    expect(createNavSectionSchema.safeParse({ title: ' ' }).success).toBe(false)
    expect(createNavSectionSchema.safeParse({ title: 'x'.repeat(81) }).success).toBe(false)
  })

  it('accepts a page or an http(s) link and an optional svg icon', () => {
    expect(
      createNavSectionItemSchema.parse({
        title: 'О проекте',
        target: { kind: 'page', page_id: PAGE },
      }).icon,
    ).toBeNull()
    expect(
      createNavSectionItemSchema.parse({
        title: 'Реклама',
        icon: `<?xml version="1.0"?>\n${ICON}`,
        target: { kind: 'url', url: 'https://example.com/ads' },
      }).icon,
    ).toBe(ICON)
    expect(
      createNavSectionItemSchema.parse({
        title: 'Реклама',
        icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
        target: { kind: 'url', url: 'https://example.com/ads' },
      }).icon,
    ).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>')
    for (const url of ['javascript:alert(1)', 'ftp://example.com', 'notaurl']) {
      expect(
        createNavSectionItemSchema.safeParse({
          title: 'Реклама',
          target: { kind: 'url', url },
        }).success,
      ).toBe(false)
    }
    for (const icon of [
      'link',
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/a.png"/></svg>',
      '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>',
    ]) {
      expect(
        createNavSectionItemSchema.safeParse({
          title: 'Реклама',
          icon,
          target: { kind: 'page', page_id: PAGE },
        }).success,
      ).toBe(false)
    }
  })

  it('rejects a duplicated order', () => {
    expect(navSectionOrderSchema.safeParse({ section_ids: [SECTION, SECTION] }).success).toBe(false)
  })

  it('hides drafts, deleted pages and broken links from the public sidebar', () => {
    const section: AdminNavSection = {
      id: SECTION,
      title: 'О площадке',
      position: 0,
      items: [
        item('55555555-5555-4555-8555-555555555555', {
          kind: 'page',
          page_id: PAGE,
          slug: 'welcome-page',
          status: 'published',
        }),
        item('66666666-6666-4666-8666-666666666666', {
          kind: 'page',
          page_id: PAGE,
          slug: 'draft-page',
          status: 'draft',
        }),
        item('77777777-7777-4777-8777-777777777777', {
          kind: 'page',
          page_id: null,
          slug: null,
          status: null,
        }),
        item('88888888-8888-4888-8888-888888888888', {
          kind: 'page',
          page_id: PAGE,
          slug: 'gone',
          status: 'deleted',
        }),
        item('99999999-9999-4999-8999-999999999999', {
          kind: 'url',
          url: 'https://example.com',
        }),
      ],
    }
    expect(toPublicNavSections([section])[0]?.items).toEqual([
      {
        id: '55555555-5555-4555-8555-555555555555',
        title: '55555555',
        icon: ICON,
        href: '/pages/welcome-page',
        is_external: false,
      },
      {
        id: '99999999-9999-4999-8999-999999999999',
        title: '99999999',
        icon: ICON,
        href: 'https://example.com',
        is_external: true,
      },
    ])
  })
})
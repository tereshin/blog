import type { AdminNavSection } from '@blog/contracts'

const WELCOME = '33333333-3333-4333-8333-333333333333'
const INFO_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 8h.01"/></svg>'
const LINK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></svg>'

export const NAV_SECTIONS_FIXTURE: AdminNavSection[] = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    title: 'О площадке',
    position: 0,
    items: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        title: 'О проекте',
        icon: INFO_ICON,
        position: 0,
        target: { kind: 'page', page_id: WELCOME, slug: 'welcome-page', status: 'published' },
      },
      {
        id: '66666666-6666-4666-8666-666666666666',
        title: 'Реклама',
        icon: LINK_ICON,
        position: 1,
        target: { kind: 'url', url: 'https://example.com' },
      },
    ],
  },
]

import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import type { ArticleCardModel } from '../model/article-types.ts'
import { AuthorStatusIconsProvider } from '../model/author-status-icons.tsx'
import { ArticleByline } from './ArticleByline.tsx'

const STATUS_ID = '44444444-4444-4444-8444-444444444444'

const author: ArticleCardModel['author'] = {
  user_id: 'u1',
  display_name: 'Анна Авторова',
  avatar_url: null,
  slug: 'anna',
  href: '/u/anna',
  status_icon_id: STATUS_ID,
}

const topic: ArticleCardModel['topic'] = {
  id: 't1',
  title: 'Технологии',
  slug: 'tehnologii',
  status: 'active',
  href: '/t/tehnologii',
}

function renderByline(status_icon_id: string | null) {
  return render(
    <MemoryRouter>
      <AuthorStatusIconsProvider
        icons={[{ id: STATUS_ID, label: 'В отпуске', image_url: 'https://example.com/holiday.png' }]}
      >
        <ArticleByline author={{ ...author, status_icon_id }} topic={topic} published_at="2026-10-08T09:05:00.000Z" />
      </AuthorStatusIconsProvider>
    </MemoryRouter>,
  )
}

describe('ArticleByline', () => {
  afterEach(cleanup)

  it('показывает статус автора рядом с именем', () => {
    renderByline(STATUS_ID)
    const status = screen.getByRole('img', { name: 'В отпуске' })
    expect(status.getAttribute('src')).toBe('https://example.com/holiday.png')
    expect(screen.getByText('Анна Авторова').closest('a')?.getAttribute('href')).toBe('/u/anna')
  })

  it('не занимает место, когда статус не выбран или неизвестен', () => {
    const { rerender } = renderByline(null)
    expect(screen.queryByRole('img', { name: 'В отпуске' })).toBeNull()
    rerender(
      <MemoryRouter>
        <AuthorStatusIconsProvider
          icons={[{ id: STATUS_ID, label: 'В отпуске', image_url: 'https://example.com/holiday.png' }]}
        >
          <ArticleByline
            author={{ ...author, status_icon_id: '55555555-5555-4555-8555-555555555555' }}
            topic={topic}
            published_at="2026-10-08T09:05:00.000Z"
          />
        </AuthorStatusIconsProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('img', { name: 'В отпуске' })).toBeNull()
  })
})

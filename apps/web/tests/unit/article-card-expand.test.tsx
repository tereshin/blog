import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArticleCard, ArticleCardExpand, getArticle, toArticleCard } from '@/entities/article'
import type { ArticleLoad } from '@/entities/article'
import { buildFeedFixture } from '@/shared/api/mocks/fixtures/feed.ts'

vi.mock('@/entities/article/api/get-article.ts', () => ({ getArticle: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

const fixture = buildFeedFixture(1)[0]
if (!fixture) throw new Error('Missing article fixture')
const card = toArticleCard({ ...fixture, excerpt: 'Начало статьи.', first_image_url: 'https://example.com/one.png' })
const loaded: ArticleLoad = {
  status: 'ok',
  article: {
    ...card,
    blocks: [
      { type: 'paragraph', data: { text: card.excerpt } },
      { type: 'image', data: { file: { url: card.first_image_url } } },
      { type: 'paragraph', data: { text: 'Продолжение статьи.' } },
    ],
    status: 'published',
    is_own: false,
  },
}

function showCard(has_more_content = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ArticleCard article={card}>
          <ArticleCardExpand slug={card.slug} has_more_content={has_more_content}>
            <ArticleCard.Excerpt />
            <ArticleCard.Image />
          </ArticleCardExpand>
        </ArticleCard>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('раскрытие карточки статьи', () => {
  it('не предлагает раскрытие, если фрагмент содержит всю статью', () => {
    showCard(false)
    expect(screen.getByText(card.excerpt)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Показать полностью' })).toBeNull()
    expect(getArticle).not.toHaveBeenCalled()
  })

  it('заменяет фрагмент и изображение полным текстом, а при сворачивании возвращает их', async () => {
    vi.mocked(getArticle).mockResolvedValue(loaded)
    showCard()
    expect(getArticle).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Показать полностью' }))
    await screen.findByText('Продолжение статьи.')
    expect(screen.getAllByText(card.excerpt)).toHaveLength(1)
    expect(document.querySelectorAll(`img[src="${card.first_image_url}"]`)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть' }))
    expect(screen.queryByText('Продолжение статьи.')).toBeNull()
    expect(screen.getAllByText(card.excerpt)).toHaveLength(1)
    expect(document.querySelectorAll(`img[src="${card.first_image_url}"]`)).toHaveLength(1)
  })

  it('сохраняет фрагмент при ошибке загрузки', async () => {
    vi.mocked(getArticle).mockRejectedValue(new Error('unavailable'))
    showCard()
    fireEvent.click(screen.getByRole('button', { name: 'Показать полностью' }))
    await waitFor(() => expect(getArticle).toHaveBeenCalled())
    await screen.findByText('Не удалось раскрыть статью')
    expect(screen.getAllByText(card.excerpt)).toHaveLength(1)
  })
})

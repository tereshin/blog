import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { ArticleCard } from './ArticleCard.tsx'
import { makeArticle } from './ArticleCard.fixtures.ts'

afterEach(cleanup)

describe('article block preview', () => {
  it('keeps the first two blocks, their order, captions and inline formatting', () => {
    const article = makeArticle({ preview_blocks: [
      { id: 'photo', type: 'image', data: { file: { url: 'https://example.com/photo.png' }, caption: 'Подпись <b>фото</b>' } },
      { id: 'list', type: 'list', data: { style: 'ordered', items: [{ content: 'Пункт <i>списка</i>', items: ['Вложенный пункт'] }] } },
      { id: 'third', type: 'paragraph', data: { text: 'Третий блок' } },
    ] })
    const { container } = render(<MemoryRouter><ArticleCard article={article}><ArticleCard.Title /><ArticleCard.Preview /></ArticleCard></MemoryRouter>)
    const blocks = container.querySelector('.document-content')
    expect(blocks?.children[0]?.tagName).toBe('FIGURE')
    expect(blocks?.children[1]?.tagName).toBe('OL')
    expect(container.querySelector('figcaption b')).toHaveTextContent('фото')
    expect(container.querySelector('li i')).toHaveTextContent('списка')
    expect(screen.getByText('Вложенный пункт')).toBeVisible()
    expect(screen.queryByText(article.excerpt)).toBeNull()
    expect(screen.queryByText('Третий блок')).toBeNull()
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('does not replace an empty document with a derived excerpt or image', () => {
    const { container } = render(<MemoryRouter><ArticleCard article={makeArticle({ preview_blocks: [] })}><ArticleCard.Preview /></ArticleCard></MemoryRouter>)
    expect(container.querySelector('.document-content,img')).toBeNull()
  })
})

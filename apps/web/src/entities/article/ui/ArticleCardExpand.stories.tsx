import type { Meta, StoryObj } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { articleKeys } from '../model/article-keys.ts'
import type { ArticleLoad } from '../model/article-types.ts'
import { ArticleCard } from './ArticleCard.tsx'
import { makeArticle } from './ArticleCard.fixtures.ts'
import { ArticleCardExpand } from './ArticleCardExpand.tsx'

function Frame({ has_more_content }: { has_more_content: boolean }) {
  const article = makeArticle({
    title: has_more_content ? 'Длинная статья' : 'Короткая заметка',
    excerpt: 'Начало статьи, которое видно в карточке.',
    first_image_url: null,
    has_more_content,
  })
  const [client] = useState(() => {
    const query_client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
    const loaded: ArticleLoad = {
      status: 'ok',
      article: {
        ...article,
        status: 'published',
        is_own: false,
        blocks: [
          { type: 'paragraph', data: { text: article.excerpt } },
          { type: 'paragraph', data: { text: 'Продолжение появляется вместо фрагмента. Первый абзац не повторяется.' } },
        ],
      },
    }
    query_client.setQueryData<ArticleLoad>(articleKeys.detail(article.slug), loaded)
    return query_client
  })
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <div className="mx-auto max-w-[640px] p-4">
          <ArticleCard article={article}>
            <ArticleCard.Header />
            <ArticleCard.Title />
            <ArticleCardExpand slug={article.slug} has_more_content={has_more_content}>
              <ArticleCard.Excerpt />
            </ArticleCardExpand>
            <ArticleCard.Actions />
          </ArticleCard>
        </div>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const meta = { title: 'entities/article/ArticleCardExpand', component: Frame } satisfies Meta<typeof Frame>
export default meta
type Story = StoryObj<typeof meta>

export const ShortNote: Story = { args: { has_more_content: false } }
export const LongArticle: Story = { args: { has_more_content: true } }

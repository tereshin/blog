import preview from '#.storybook/preview'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
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
  const load: ArticleLoad = {
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
  const [is_open, setOpen] = useState(false)
  return (
    <MemoryRouter>
      <div className="mx-auto max-w-[640px] p-4">
        <ArticleCard article={article}>
          <ArticleCard.Header />
          <ArticleCard.Title />
          <ArticleCardExpand
            has_more_content={has_more_content}
            is_open={is_open}
            load={load}
            article={load.article}
            onToggle={() => setOpen((open) => !open)}
          >
            <ArticleCard.Excerpt />
          </ArticleCardExpand>
          <ArticleCard.Actions />
        </ArticleCard>
      </div>
    </MemoryRouter>
  )
}

const meta = preview.meta({ title: 'entities/article/ArticleCardExpand', component: Frame })
export const ShortNote = meta.story({ args: { has_more_content: false } })
export const LongArticle = meta.story({ args: { has_more_content: true } })

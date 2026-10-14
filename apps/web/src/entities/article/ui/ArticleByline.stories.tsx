import preview from '#.storybook/preview'
import { MemoryRouter } from 'react-router'
import { makeArticle } from './ArticleCard.fixtures.ts'
import { ArticleByline } from './ArticleByline.tsx'

function Frame() {
  const article = makeArticle()
  return (
    <MemoryRouter>
      <div className="p-4">
        <ArticleByline author={article.author} topic={article.topic} time_label={article.time_label} />
      </div>
    </MemoryRouter>
  )
}

const meta = preview.meta({ title: 'entities/article/ArticleByline', component: Frame })
export const Default = meta.story({})

import preview from '#.storybook/preview'
import { Link, MemoryRouter } from 'react-router'
import { Button, MoreIcon } from '@/shared/ui'
import type { ArticleCardModel } from '../model/article-types.ts'
import { ArticleCard } from './ArticleCard.tsx'
import { makeArticle } from './ArticleCard.fixtures.ts'

type Props = { article: ArticleCardModel; is_own?: boolean }

function FullCard({ article, is_own = false }: Props) {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <ArticleCard article={article}>
        <ArticleCard.Header
          {...(is_own
            ? {}
            : {
                follow: (
                  <Button variant="tertiary" size="sm">
                    Подписаться
                  </Button>
                ),
              })}
          menu={
            <Button variant="ghost" isIconOnly aria-label="Ещё">
              <MoreIcon />
            </Button>
          }
        />
        <ArticleCard.Title />
        <ArticleCard.Preview />
        <ArticleCard.Expand>
          <Button variant="ghost" size="sm">
            Показать полностью
          </Button>
        </ArticleCard.Expand>
        <ArticleCard.Reactions>
          <span className="text-sm text-muted">Реакции подключаются сценарием «Реакции»</span>
        </ArticleCard.Reactions>
        <ArticleCard.Actions />
        <ArticleCard.CommentPeek />
      </ArticleCard>
    </div>
  )
}

const meta = preview.meta({
  title: 'entities/article/ArticleCard',
  component: FullCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: { article: makeArticle() },
})
export const WithImage = meta.story()
export const WithoutImage = meta.story({ args: { article: makeArticle({ first_image_url: null }) } })
export const WithoutComments = meta.story({
  args: { article: makeArticle({ top_comment: null, comment_count: 0 }) },
})
export const WithoutReactions = meta.story({
  args: {
    article: makeArticle({
      reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 0 },
      reaction_count: 0,
      bookmark_count: 0,
      view_count: 3,
    }),
  },
})
export const Own = meta.story({ args: { is_own: true } })
export const OriginalBlocks = meta.story({
  args: { article: makeArticle({ preview_blocks: [
    { type: 'quote', data: { text: 'Сначала <b>цитата</b>, а не текстовый фрагмент.', caption: 'Автор' } },
    { type: 'list', data: { style: 'ordered', items: ['Первый пункт', 'Второй <i>пункт</i>'] } },
  ] }) },
})
export const Loading = meta.story({
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <ArticleCard.Skeleton />
    </div>
  ),
})

export const CustomTitleLink = meta.story({
  render: ({ article }) => (
    <ArticleCard article={article}>
      <ArticleCard.Header />
      <ArticleCard.Title>
        <Link
          to={`${article.href}?from=moderation`}
          state={{ moderation_return_to: '/admin/moderation/articles' }}
        >
          {article.title}
        </Link>
      </ArticleCard.Title>
      <ArticleCard.Preview />
    </ArticleCard>
  ),
})

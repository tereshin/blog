import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
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
          {...(is_own ? {} : { follow: <Button variant="tertiary" size="sm">Подписаться</Button> })}
          menu={
            <Button variant="ghost" isIconOnly aria-label="Ещё">
              <MoreIcon />
            </Button>
          }
        />
        <ArticleCard.Title />
        <ArticleCard.Excerpt />
        <ArticleCard.Image />
        <ArticleCard.Expand>
          <Button variant="ghost" size="sm">Показать полностью</Button>
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

const meta = {
  title: 'entities/article/ArticleCard',
  component: FullCard,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  args: { article: makeArticle() },
} satisfies Meta<typeof FullCard>
export default meta
type Story = StoryObj<typeof meta>

export const WithImage: Story = {}
export const WithoutImage: Story = { args: { article: makeArticle({ first_image_url: null }) } }
export const WithoutComments: Story = { args: { article: makeArticle({ top_comment: null, comment_count: 0 }) } }
export const WithoutReactions: Story = {
  args: {
    article: makeArticle({ reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 0 }, reaction_count: 0, bookmark_count: 0, view_count: 3 }),
  },
}
export const Own: Story = { args: { is_own: true } }
export const Loading: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <ArticleCard.Skeleton />
    </div>
  ),
}

import preview from '#.storybook/preview'
import { MemoryRouter } from 'react-router'
import { PopularCommentItem } from './PopularCommentItem.tsx'

function Frame() {
  return (
    <MemoryRouter>
      <ul className="max-w-sm p-4">
        <PopularCommentItem
          comment={{
            id: 'c1',
            author_name: 'Борис Писарев',
            author_avatar_url: null,
            excerpt: 'Главное — стабильный порядок.',
            article_title: 'Курсорная пагинация',
            href: '/p/kursornaya-paginatsiya#comments',
            reaction_count: 3,
            reaction_counts: { laugh: 1, heart: 2, thumb: 0, fire: 0 },
          }}
        />
      </ul>
    </MemoryRouter>
  )
}

const meta = preview.meta({ title: 'entities/comment/PopularCommentItem', component: Frame })
export const Default = meta.story({})

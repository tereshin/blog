import preview from '#.storybook/preview'
import { MemoryRouter } from 'react-router'
import { Card } from '@/shared/ui'
import { ArticleActions } from './ArticleActions.tsx'

const meta = preview.meta({
  title: 'entities/article/ArticleActions',
  component: ArticleActions,
  decorators: [(Story) => <MemoryRouter><Card className="mx-auto max-w-2xl gap-0"><Story /></Card></MemoryRouter>],
  args: { article: { href: '/p/statya-1', comment_count: 12, bookmark_count: 5, view_count: 328 } },
})
export const Default = meta.story()
export const EmptyCounts = meta.story({
  args: { article: { href: '/p/statya-1', comment_count: 0, bookmark_count: 0, view_count: 0 } },
})
export const LargeCounts = meta.story({
  args: { article: { href: '/p/statya-1', comment_count: 1200, bookmark_count: 5300, view_count: 1280000 } },
})

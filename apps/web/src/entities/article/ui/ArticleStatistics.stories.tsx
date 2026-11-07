import preview from '#.storybook/preview'
import { ArticleStatistics } from './ArticleStatistics.tsx'

const meta = preview.meta({
  title: 'entities/article/ArticleStatistics',
  component: ArticleStatistics,
  decorators: [(Story) => <div className="flex p-6"><Story /></div>],
  args: { article: { view_count: 1876, reaction_count: 77, comment_count: 14, bookmark_count: 2 } },
})

export const Default = meta.story()
export const Open = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'))
  },
})
export const Empty = meta.story({
  args: { article: { view_count: 0, reaction_count: 0, comment_count: 0, bookmark_count: 0 } },
  play: Open.input.play,
})
export const LargeCounts = meta.story({
  args: { article: { view_count: 1280000, reaction_count: 6500, comment_count: 1200, bookmark_count: 5300 } },
  play: Open.input.play,
})

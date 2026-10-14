import preview from '#.storybook/preview'
import { ArticleUnavailable } from './ArticleUnavailable.tsx'

const meta = preview.meta({
  title: 'widgets/article-view/ArticleUnavailable',
  component: ArticleUnavailable,
  args: { status: 'unavailable' },
})
export const Unavailable = meta.story({ args: { status: 'unavailable' } })
export const MembersOnly = meta.story({ args: { status: 'members_only' } })

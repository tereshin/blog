import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArticleUnavailable } from './ArticleUnavailable.tsx'

const meta = {
  title: 'widgets/article-view/ArticleUnavailable',
  component: ArticleUnavailable,
  args: { status: 'unavailable' },
} satisfies Meta<typeof ArticleUnavailable>
export default meta
type Story = StoryObj<typeof meta>

export const Unavailable: Story = {}
export const MembersOnly: Story = { args: { status: 'members_only' } }

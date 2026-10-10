import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CommentSort } from '../model/sort-comments.ts'
import { CommentSortMenu } from './CommentSortMenu.tsx'

const meta = {
  title: 'entities/comment/CommentSortMenu',
  component: CommentSortMenu,
} satisfies Meta<typeof CommentSortMenu>
export default meta
type Story = StoryObj<typeof CommentSortMenu>

function Preview({ initial }: { initial: CommentSort }) {
  const [sort, setSort] = useState(initial)
  return <CommentSortMenu value={sort} onChange={setSort} />
}

export const Best: Story = { render: () => <Preview initial="best" /> }
export const Newest: Story = { render: () => <Preview initial="newest" /> }
export const Oldest: Story = { render: () => <Preview initial="oldest" /> }

import preview from '#.storybook/preview'
import { useState } from 'react'
import type { CommentSort } from '../model/sort-comments.ts'
import { CommentSortMenu } from './CommentSortMenu.tsx'

const meta = preview.meta({
  title: 'entities/comment/CommentSortMenu',
  component: CommentSortMenu,
})
function Preview({ initial }: { initial: CommentSort }) {
  const [sort, setSort] = useState(initial)
  return <CommentSortMenu value={sort} onChange={setSort} />
}

export const Best = meta.story({ render: () => <Preview initial="best" /> })
export const Newest = meta.story({ render: () => <Preview initial="newest" /> })
export const Oldest = meta.story({ render: () => <Preview initial="oldest" /> })

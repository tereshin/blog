import preview from '#.storybook/preview'
import { MemoryRouter } from 'react-router'
import type { CommentNode } from '../model/comment-types.ts'
import type { CommentsState } from '../model/useComments.ts'
import { CommentThread } from './CommentThread.tsx'

const counts = { laugh: 1, heart: 0, thumb: 0, fire: 0 }

const visible: CommentNode = {
  id: '7a1c2d30-1111-4a11-8a11-000000000010',
  author: {
    user_id: 'a1000000-0000-4000-8000-000000000001',
    display_name: 'Анна Авторова',
    avatar_url: null,
  },
  body: 'Хороший разбор, спасибо.',
  status: 'visible',
  edited_at: '2026-10-08T12:00:00.000Z',
  reaction_counts: counts,
  reaction_count: 1,
  my_reaction: null,
  created_at: '2026-10-08T10:00:00.000Z',
  time_label: '12:00',
  replies: [
    {
      id: '7a1c2d30-1111-4a11-8a11-000000000011',
      author: {
        user_id: 'a1000000-0000-4000-8000-000000000002',
        display_name: 'Борис Писарев',
        avatar_url: null,
      },
      body: 'Согласен.',
      status: 'visible',
      edited_at: null,
      reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 0 },
      reaction_count: 0,
      my_reaction: null,
      created_at: '2026-10-08T11:00:00.000Z',
      time_label: '13:00',
      replies: [],
    },
  ],
}

const deleted: CommentNode = {
  ...visible,
  id: '7a1c2d30-1111-4a11-8a11-000000000012',
  status: 'deleted',
  body: null,
  replies: visible.replies,
}
const hidden: CommentNode = {
  ...visible,
  id: '7a1c2d30-1111-4a11-8a11-000000000013',
  status: 'hidden',
  body: null,
  replies: [],
}

const meta = preview.meta({
  title: 'entities/comment/CommentThread',
  component: CommentThread,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
})
function story(state: CommentsState) {
  return { args: { state } }
}

export const Loading = meta.story(story({ status: 'loading' }))
export const Empty = meta.story(story({ status: 'empty' }))
export const Error = meta.story(story({ status: 'error', refetch: () => undefined }))
export const Visible = meta.story(story({
  status: 'ok',
  comments: [visible],
  has_next: false,
  fetchNext: () => undefined,
}))
export const Deleted = meta.story(story({
  status: 'ok',
  comments: [deleted],
  has_next: false,
  fetchNext: () => undefined,
}))
export const Hidden = meta.story(story({
  status: 'ok',
  comments: [hidden],
  has_next: false,
  fetchNext: () => undefined,
}))

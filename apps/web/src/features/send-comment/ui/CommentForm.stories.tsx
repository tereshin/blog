import preview from '#.storybook/preview'
import { HttpResponse, http } from 'msw'
import { userEvent, within } from 'storybook/test'
import { StoryProviders } from '@/shared/lib'
import { CommentForm } from './CommentForm.tsx'

const meta = preview.meta({
  title: 'features/send-comment/CommentForm',
  component: CommentForm,
  decorators: [
    (Story) => (
      <StoryProviders>
        <div className="max-w-[640px] rounded-card bg-surface p-6">
          <Story />
        </div>
      </StoryProviders>
    ),
  ],
  args: {
    article_id: '9b2e3f40-2222-4b22-8b22-000000000001',
    author: {
      user_id: '0b3a4c50-3333-4c33-8c33-000000000002',
      display_name: 'Анна Авторова',
      avatar_url: null,
    },
    comments_enabled: true,
    parent: null,
    onCancelReply: () => undefined,
    onSent: () => undefined,
    requireSession: (action: () => void) => action(),
  },
})
export const Compact = meta.story()
export const Focused = meta.story({
  args: { article_id: 'focused-comment-story' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('textbox'))
  },
})
export const Mentioning = meta.story({
  args: { article_id: 'mentioning-comment-story' },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole('textbox'), '@')
  },
})
export const Filled = meta.story({
  args: { article_id: 'filled-comment-story' },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole('textbox'), 'Спасибо за статью!')
  },
})
export const Reply = meta.story({
  args: { parent: { id: '7a1c2d30-1111-4a11-8a11-000000000010', name: 'Анна Авторова' } },
})
export const DiscussionDisabled = meta.story({ args: { comments_enabled: false } })
export const SendError = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.post('*/v1/articles/:id/comments', () =>
          HttpResponse.json(
            { code: 'unavailable', title: 'Попробуйте отправить позже' },
            { status: 503 },
          ),
        ),
      ],
    },
  },
})

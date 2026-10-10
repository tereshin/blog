import type { Meta, StoryObj } from '@storybook/react-vite'
import { HttpResponse, http } from 'msw'
import { StoryProviders } from '@/shared/api/mocks/StoryProviders.tsx'
import { CommentForm } from './CommentForm.tsx'

const meta = {
  title: 'features/send-comment/CommentForm',
  component: CommentForm,
  decorators: [
    (Story) => (
      <StoryProviders>
        <div className="max-w-xl bg-surface p-5">
          <Story />
        </div>
      </StoryProviders>
    ),
  ],
  args: {
    article_id: '9b2e3f40-2222-4b22-8b22-000000000001',
    comments_enabled: true,
    parent: null,
    onCancelReply: () => undefined,
    onSent: () => undefined,
    requireSession: (action: () => void) => action(),
  },
} satisfies Meta<typeof CommentForm>
export default meta
type Story = StoryObj<typeof CommentForm>

export const Compact: Story = {}
export const Reply: Story = {
  args: { parent: { id: '7a1c2d30-1111-4a11-8a11-000000000010', name: 'Анна Авторова' } },
}
export const DiscussionDisabled: Story = { args: { comments_enabled: false } }
export const SendError: Story = {
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
}

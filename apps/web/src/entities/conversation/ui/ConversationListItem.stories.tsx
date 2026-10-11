import type { Meta, StoryObj } from '@storybook/react-vite'
import { StoryProviders } from '@/shared/api/mocks'
import { ConversationListItem } from './ConversationListItem.tsx'

const meta = {
  title: 'entities/conversation/ConversationListItem',
  component: ConversationListItem,
  args: {
    is_selected: false,
    conversation: {
      id: '00000000-0000-4000-8000-000000000001',
      peer: { user_id: 'reader', display_name: 'Роман Читаев', avatar_url: null, slug: 'reader' },
      last_message_at: '2026-10-11T12:30:00Z',
      last_message_excerpt: 'Привет! Как идёт работа над статьёй?',
      time_label: '12:30',
      unread_count: 0,
    },
  },
  decorators: [
    (Story) => (
      <StoryProviders route="/messages">
        <div className="w-full max-w-[640px] rounded-card bg-surface p-2">
          <Story />
        </div>
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof ConversationListItem>
export default meta
type Story = StoryObj<typeof meta>

export const Read: Story = {}
export const Unread: Story = {
  args: { conversation: { ...meta.args.conversation, unread_count: 3 } },
}
export const Selected: Story = { args: { is_selected: true } }
export const LongPreview: Story = {
  args: {
    conversation: {
      ...meta.args.conversation,
      peer: {
        ...meta.args.conversation.peer,
        display_name: 'Роман с очень длинным именем и фамилией',
      },
      last_message_excerpt:
        'Длинное сообщение, которое должно обрезаться в пределах строки и оставлять место для времени и числа непрочитанных.',
      unread_count: 123,
    },
  },
}

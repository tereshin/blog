import type { Meta, StoryObj } from '@storybook/react-vite'
import { MessageBubble } from './MessageBubble.tsx'

const meta = {
  title: 'entities/conversation/MessageBubble',
  component: MessageBubble,
  args: {
    is_own: false,
    message: {
      id: 'message',
      conversation_id: 'conversation',
      sender_id: 'reader',
      body: 'Привет! Как идёт работа над статьёй?',
      created_at: '2026-10-11T12:30:00Z',
      read_at: null,
      time_label: '12:30',
    },
  },
  decorators: [
    (Story) => (
      <div className="flex w-full max-w-[640px] flex-col rounded-card bg-surface p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MessageBubble>
export default meta
type Story = StoryObj<typeof meta>

export const Incoming: Story = {}
export const Own: Story = { args: { is_own: true } }
export const Multiline: Story = {
  args: {
    message: {
      ...meta.args.message,
      body: 'Привет, Роман!\n\nЧерновик готов. Пришлю его вечером, чтобы обсудить детали.',
    },
  },
}
export const LongWord: Story = {
  args: {
    is_own: true,
    message: { ...meta.args.message, body: 'ДлинноеСловоБезПробелов'.repeat(20) },
  },
}

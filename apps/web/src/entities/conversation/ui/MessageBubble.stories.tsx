import preview from '#.storybook/preview'
import { MessageBubble } from './MessageBubble.tsx'

const MESSAGE = {
  id: 'message',
  conversation_id: 'conversation',
  sender_id: 'reader',
  body: 'Привет! Как идёт работа над статьёй?',
  created_at: '2026-10-11T12:30:00Z',
  read_at: null,
  time_label: '12:30',
}

const meta = preview.meta({
  title: 'entities/conversation/MessageBubble',
  component: MessageBubble,
  args: {
    is_own: false,
    message: MESSAGE,
  },
  decorators: [
    (Story) => (
      <div className="flex w-full max-w-[640px] flex-col rounded-card bg-surface p-5">
        <Story />
      </div>
    ),
  ],
})
export const Incoming = meta.story()
export const Own = meta.story({ args: { is_own: true } })
export const Multiline = meta.story({
  args: {
    message: {
      ...MESSAGE,
      body: 'Привет, Роман!\n\nЧерновик готов. Пришлю его вечером, чтобы обсудить детали.',
    },
  },
})
export const LongWord = meta.story({
  args: {
    is_own: true,
    message: { ...MESSAGE, body: 'ДлинноеСловоБезПробелов'.repeat(20) },
  },
})

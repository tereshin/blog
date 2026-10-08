import { at } from './anchor.ts'
import { conversationId } from './conversations.ts'
import { seedId } from './ids.ts'
import { userId } from './participants.ts'
import type { SeedMessage } from './types.ts'

const HOUR = 60 * 60 * 1000

type MessageInput = { name: string; conversation: string; sender: string; body: string; hours_ago: number; is_read: boolean }

/** Диалог читателя с автором: два прочитанных сообщения и два непрочитанных. Диалог с author_b прочитан целиком. */
export function buildSmallMessages(anchor: Date): SeedMessage[] {
  const inputs: MessageInput[] = [
    { name: 'a1', conversation: 'reader-author_a', sender: 'reader', body: 'Здравствуйте! Можно задать вопрос по вашей статье?', hours_ago: 30, is_read: true },
    { name: 'a2', conversation: 'reader-author_a', sender: 'author_a', body: 'Конечно, спрашивайте.', hours_ago: 28, is_read: true },
    { name: 'a3', conversation: 'reader-author_a', sender: 'author_a', body: 'Кстати, я дописала раздел про границы.', hours_ago: 4, is_read: false },
    { name: 'a4', conversation: 'reader-author_a', sender: 'author_a', body: 'Посмотрите, когда будет время.', hours_ago: 3, is_read: false },
    { name: 'b1', conversation: 'reader-author_b', sender: 'reader', body: 'Спасибо за заметку про команды.', hours_ago: 72, is_read: true },
    { name: 'b2', conversation: 'reader-author_b', sender: 'author_b', body: 'Рад, что пригодилось!', hours_ago: 70, is_read: true },
  ]
  return inputs.map((input) => {
    const created_at = at(anchor, -input.hours_ago * HOUR)
    return {
      id: seedId('message', input.name),
      conversation_id: conversationId(input.conversation),
      sender_id: userId(input.sender),
      body: input.body,
      created_at,
      read_at: input.is_read ? new Date(created_at.getTime() + HOUR) : null,
    }
  })
}

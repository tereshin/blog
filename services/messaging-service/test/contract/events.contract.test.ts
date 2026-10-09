import { readFileSync } from 'node:fs'
import { MessageSentV1 } from '@blog/contracts'
import { describe, expect, it } from 'vitest'
import { messageSentEvent } from '../../src/modules/message/message.events.ts'

const fixture = new URL('../../../../packages/contracts/test/fixtures/messaging/message-sent.json', import.meta.url)

describe('messaging: контракт событий', () => {
  it('производитель сериализует отправку сообщения', () => {
    const event = messageSentEvent({
      correlation_id: 'c-1',
      occurred_at: '2026-10-08T12:00:00.000Z',
      message_id: '6a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a41',
      conversation_id: '7b1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a52',
      sender_id: '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22',
      recipient_id: '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99',
      excerpt: 'Короткий текст',
    })
    expect(MessageSentV1.parse(event).excerpt).toBe('Короткий текст')
  })

  it('потребитель разбирает фикстуру контракта', () => {
    const raw: unknown = JSON.parse(readFileSync(fixture, 'utf8'))
    expect(MessageSentV1.parse(raw).name).toBe('messaging.message.sent')
  })
})

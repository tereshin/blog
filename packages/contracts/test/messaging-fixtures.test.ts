import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MessageSentV1 } from '../src/index.ts'

const fixtures = dirname(fileURLToPath(import.meta.url))

describe('фикстуры сообщений', () => {
  it('messaging.message.sent', () => {
    const event = MessageSentV1.parse(JSON.parse(readFileSync(join(fixtures, 'fixtures/messaging/message-sent.json'), 'utf8')))
    expect(event.excerpt).toBe('Короткий текст')
    expect(event.sender_id).not.toBe(event.recipient_id)
  })
})

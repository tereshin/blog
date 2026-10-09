import { readFileSync } from 'node:fs'
import { NotificationCreatedV1 } from '@blog/contracts'
import { describe, expect, it } from 'vitest'
import { notificationCreatedEvent } from '../../src/modules/notification/notification.events.ts'

const fixture = new URL('../../../../packages/contracts/test/fixtures/notification/notification-created.json', import.meta.url)

describe('notification: контракт событий', () => {
  it('производитель сериализует уведомление', () => {
    const event = notificationCreatedEvent({
      occurred_at: '2026-10-08T12:00:00.000Z',
      correlation_id: 'c-1',
      causation_id: null,
      notification_id: '6a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a41',
      user_id: '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22',
      kind: 'comment',
    })
    expect(NotificationCreatedV1.parse(event).kind).toBe('comment')
  })

  it('потребитель разбирает фикстуру контракта', () => {
    const raw: unknown = JSON.parse(readFileSync(fixture, 'utf8'))
    expect(NotificationCreatedV1.parse(raw).name).toBe('notification.notification.created')
  })
})

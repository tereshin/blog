import { SessionRevokedV1 } from '@blog/contracts'
import { describe, expect, it } from 'vitest'

describe('gateway: контракт событий', () => {
  it('потребитель разбирает отзыв сессии так же, как подписка gateway', () => {
    const raw = {
      event_id: '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22',
      name: 'identity.session.revoked',
      occurred_at: '2026-10-08T12:00:00.000Z',
      correlation_id: 'c-1',
      causation_id: null,
      version: 1,
      session_ids: ['session-1'],
      user_id: '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99',
    }
    expect(SessionRevokedV1.parse(raw).session_ids).toEqual(['session-1'])
  })
})

import { readFileSync } from 'node:fs'
import { UserCreatedV1 } from '@blog/contracts'
import { describe, expect, it } from 'vitest'
import { sessionRevokedEvent, userCreatedEvent } from '../../src/modules/auth/auth.events.ts'

const fixture = new URL('../../../../packages/contracts/test/fixtures/identity/user-created.json', import.meta.url)

describe('identity: контракт событий', () => {
  it('производитель сериализует событие той же схемой, что и контракт', () => {
    const created = userCreatedEvent({
      correlation_id: 'c-1',
      user_id: '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99',
      public_number: 9,
      role: 'member',
      can_publish: true,
      is_restricted: false,
      created_at: '2026-10-08T12:00:00.000Z',
      display_name: 'Наум Новиков',
    })
    expect(created.name).toBe('identity.user.created')
    expect(UserCreatedV1.parse(created).display_name).toBe('Наум Новиков')
    const revoked = sessionRevokedEvent({
      correlation_id: 'c-1',
      session_ids: ['session-1'],
      user_id: '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99',
    })
    expect(revoked.name).toBe('identity.session.revoked')
  })

  it('потребитель разбирает фикстуру контракта', () => {
    const raw: unknown = JSON.parse(readFileSync(fixture, 'utf8'))
    expect(UserCreatedV1.parse(raw).role).toBe('member')
  })
})

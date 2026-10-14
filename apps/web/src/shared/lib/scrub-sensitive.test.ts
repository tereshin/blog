import { describe, expect, it } from 'vitest'
import { scrubSensitive } from '@/shared/lib'

describe('scrubSensitive', () => {
  it('затирает ключи секретов и Bearer в строках', () => {
    expect(
      scrubSensitive({
        authorization: 'Bearer abc',
        cookie: 'sid=1',
        nested: { session_id: 'x', title: 'Заголовок' },
        note: 'Bearer raw-token',
      }),
    ).toEqual({
      authorization: '[redacted]',
      cookie: '[redacted]',
      nested: { session_id: '[redacted]', title: 'Заголовок' },
      note: 'Bearer [redacted]',
    })
  })
})

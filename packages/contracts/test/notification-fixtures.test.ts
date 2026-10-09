import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { NotificationCreatedV1 } from '../src/index.ts'

const fixtures = dirname(fileURLToPath(import.meta.url))

describe('фикстуры уведомлений', () => {
  it('notification.created', () => {
    expect(NotificationCreatedV1.parse(JSON.parse(readFileSync(join(fixtures, 'fixtures/notification/notification-created.json'), 'utf8'))).kind).toBe('comment')
  })
})

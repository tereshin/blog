import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ProfileUpdatedV1, UserCreatedV1, UserRestrictedV1, UserUpdatedV1 } from '../src/index.ts'

const root = dirname(fileURLToPath(import.meta.url))

function read(name: string): unknown {
  return JSON.parse(readFileSync(join(root, 'fixtures', name), 'utf8'))
}

describe('фикстуры событий входа и профиля', () => {
  it('identity.user.created несёт имя для профиля', () => {
    expect(UserCreatedV1.parse(read('identity/user-created.json')).display_name).toBe('Наум Новиков')
  })

  it('identity.user.updated', () => {
    expect(UserUpdatedV1.parse(read('identity/user-updated.json')).role).toBe('admin')
  })

  it('identity.user.restricted', () => {
    expect(UserRestrictedV1.parse(read('identity/user-restricted.json')).is_restricted).toBe(true)
  })

  it('content.profile.updated', () => {
    expect(ProfileUpdatedV1.parse(read('content/profile-updated.json')).slug).toBe('naum')
  })
})

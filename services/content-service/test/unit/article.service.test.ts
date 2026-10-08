import { describe, expect, it } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { readFailure } from '../../src/modules/article/index.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'

const guest: ServiceContext = { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' }
const member: ServiceContext = { user_id: OTHER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` }

describe('чтение статьи: причина отказа', () => {
  it('гость на статье для участников получает members_only, участник — читает', () => {
    const article = { author_id: AUTHOR, visibility: 'members' as const, status: 'published' as const }
    expect(readFailure(guest, article)).toBe('members_only')
    expect(readFailure(member, article)).toBeNull()
  })

  it('скрытая, удалённая и чужая закрытая статья не раскрывают причину', () => {
    expect(readFailure(guest, { author_id: AUTHOR, visibility: 'public', status: 'hidden' })).toBe('unavailable')
    expect(readFailure(member, { author_id: AUTHOR, visibility: 'public', status: 'deleted' })).toBe('unavailable')
    expect(readFailure(member, { author_id: AUTHOR, visibility: 'author', status: 'published' })).toBe('unavailable')
    expect(readFailure({ ...member, user_id: AUTHOR }, { author_id: AUTHOR, visibility: 'author', status: 'draft' })).toBeNull()
  })
})

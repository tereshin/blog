import { describe, expect, it } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { canRead } from './can-read.ts'

const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'

const guest: ServiceContext = { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' }
const member = (user_id: string): ServiceContext => ({
  user_id,
  role: 'member',
  is_restricted: false,
  can_publish: true,
  viewer_key: `user:${user_id}`,
})
const admin: ServiceContext = {
  user_id: OTHER,
  role: 'admin',
  is_restricted: false,
  can_publish: true,
  viewer_key: `user:${OTHER}`,
}

describe('canRead', () => {
  it('public читают все, members — только вошедшие', () => {
    expect(canRead(guest, { author_id: AUTHOR, visibility: 'public', status: 'published' })).toBe(true)
    expect(canRead(guest, { author_id: AUTHOR, visibility: 'members', status: 'published' })).toBe(false)
    expect(canRead(member(OTHER), { author_id: AUTHOR, visibility: 'members', status: 'published' })).toBe(true)
  })

  it('author — автор и администратор; черновик — только автор; скрытая — автор и администратор; удалённая — никто', () => {
    expect(canRead(member(AUTHOR), { author_id: AUTHOR, visibility: 'author', status: 'published' })).toBe(true)
    expect(canRead(member(OTHER), { author_id: AUTHOR, visibility: 'author', status: 'published' })).toBe(false)
    expect(canRead(admin, { author_id: AUTHOR, visibility: 'author', status: 'published' })).toBe(true)
    expect(canRead(member(AUTHOR), { author_id: AUTHOR, visibility: 'public', status: 'draft' })).toBe(true)
    expect(canRead(admin, { author_id: AUTHOR, visibility: 'public', status: 'draft' })).toBe(false)
    expect(canRead(admin, { author_id: AUTHOR, visibility: 'public', status: 'hidden' })).toBe(true)
    expect(canRead(guest, { author_id: AUTHOR, visibility: 'public', status: 'hidden' })).toBe(false)
    expect(canRead(admin, { author_id: AUTHOR, visibility: 'public', status: 'deleted' })).toBe(false)
  })
})

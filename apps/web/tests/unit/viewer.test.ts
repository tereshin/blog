import { describe, expect, it } from 'vitest'
import { deriveViewerHelpers, toViewer } from '@/entities/session'
import type { Session } from '@/entities/session'

function member(role: 'member' | 'admin' | 'superadmin'): Session {
  return {
    status: 'member',
    user: { id: 'u1', public_number: 1, role, can_publish: true, is_restricted: false, appearance: 'dark' },
    profile: { display_name: 'Анна', avatar_url: null, slug: 'anna' },
  }
}

describe('viewer', () => {
  it('пока сессия грузится — не гость и не участник', () => {
    const helpers = deriveViewerHelpers(toViewer({ session: undefined, is_error: false }))
    expect(helpers.is_loading).toBe(true)
    expect(helpers.is_guest).toBe(false)
  })

  it('ошибка чтения сессии даёт гостя', () => {
    expect(deriveViewerHelpers(toViewer({ session: undefined, is_error: true })).is_guest).toBe(true)
  })

  it('роли и «своё»', () => {
    const admin = deriveViewerHelpers(toViewer({ session: member('admin'), is_error: false }))
    expect(admin).toMatchObject({ is_guest: false, is_admin: true, is_superadmin: false })
    expect(admin.is_own('u1')).toBe(true)
    expect(admin.is_own('u2')).toBe(false)
    expect(deriveViewerHelpers(toViewer({ session: member('superadmin'), is_error: false })).is_admin).toBe(true)
    expect(deriveViewerHelpers(toViewer({ session: member('member'), is_error: false })).is_admin).toBe(false)
  })

  it('гость ничего не «своё»', () => {
    const guest = deriveViewerHelpers(toViewer({ session: { status: 'guest' }, is_error: false }))
    expect(guest.is_own('u1')).toBe(false)
  })
})

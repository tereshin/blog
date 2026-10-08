import { describe, expect, it } from 'vitest'
import { decideAccount, sanitizeReturnTo } from '../../src/modules/auth/index.ts'
import type { AccountUser, GoogleClaims } from '../../src/modules/auth/auth.types.ts'

const claims = (patch: Partial<GoogleClaims> = {}): GoogleClaims => ({
  sub: 'sub-new',
  email: 'new@blog.test',
  email_verified: true,
  name: 'Новый',
  ...patch,
})

function user(patch: Partial<AccountUser> = {}): AccountUser {
  return {
    id: '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22',
    email: 'root@blog.test',
    google_sub: null,
    role: 'superadmin',
    can_publish: true,
    restricted_at: null,
    public_number: 1,
    appearance: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    ...patch,
  }
}

const closed = { registration_open: false, new_members_can_publish: false }

describe('decideAccount', () => {
  it('закрытая регистрация не создаёт нового участника', () => {
    expect(decideAccount({ claims: claims(), by_sub: null, by_email: null, settings: closed, superadmin_email: 'root@blog.test' })).toEqual({
      action: 'reject',
      error: 'registration_closed',
    })
  })

  it('почта суперадминистратора создаёт учётную запись при закрытой регистрации', () => {
    expect(
      decideAccount({ claims: claims({ email: 'Root@blog.test' }), by_sub: null, by_email: null, settings: closed, superadmin_email: 'root@blog.test' }),
    ).toEqual({ action: 'create', role: 'superadmin', can_publish: true })
  })

  it('привязывает sub к строке без google_sub только при подтверждённой почте', () => {
    const existing = user()
    expect(
      decideAccount({ claims: claims({ email: 'root@blog.test', email_verified: false }), by_sub: null, by_email: existing, settings: closed, superadmin_email: 'root@blog.test' }),
    ).toEqual({ action: 'reject', error: 'email_unverified' })
    expect(
      decideAccount({ claims: claims({ email: 'root@blog.test', sub: 'google-sub' }), by_sub: null, by_email: existing, settings: closed, superadmin_email: 'root@blog.test' }),
    ).toEqual({ action: 'bind', user: existing })
  })

  it('повторный вход идёт по sub, даже если почта у издателя сменилась', () => {
    const existing = user({ google_sub: 'sub-new', email: 'old@blog.test', role: 'member' })
    expect(
      decideAccount({
        claims: claims({ email: 'new@blog.test' }),
        by_sub: existing,
        by_email: null,
        settings: closed,
        superadmin_email: 'root@blog.test',
      }),
    ).toEqual({ action: 'login', user: existing, next_email: 'new@blog.test' })
  })

  it('ограниченный участник не входит', () => {
    const existing = user({ google_sub: 'sub-new', restricted_at: new Date(), role: 'member', email: 'new@blog.test' })
    expect(decideAccount({ claims: claims(), by_sub: existing, by_email: existing, superadmin_email: 'root@blog.test' })).toEqual({
      action: 'reject',
      error: 'restricted',
    })
  })

  it('новый участник получает право публикации из копии настроек', () => {
    expect(
      decideAccount({
        claims: claims(),
        by_sub: null,
        by_email: null,
        settings: { registration_open: true, new_members_can_publish: false },
        superadmin_email: 'root@blog.test',
      }),
    ).toEqual({ action: 'create', role: 'member', can_publish: false })
  })
})

describe('sanitizeReturnTo', () => {
  it('оставляет относительный путь и отбрасывает чужой origin', () => {
    expect(sanitizeReturnTo('/u/anna?x=1')).toBe('/u/anna?x=1')
    expect(sanitizeReturnTo('https://evil.test')).toBe('/')
    expect(sanitizeReturnTo('//evil.test')).toBe('/')
    expect(sanitizeReturnTo(undefined)).toBe('/')
  })
})

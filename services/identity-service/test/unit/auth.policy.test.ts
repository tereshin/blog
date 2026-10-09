import { describe, expect, it } from 'vitest'
import { decideSignIn, displayNameFromEmail, sanitizeReturnTo } from '../../src/modules/auth/auth.policy.ts'
import type { SignInUser } from '../../src/modules/auth/auth.policy.ts'

const USER = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '4a2e4d0f-2c1b-4b66-9a3c-7a7e6e4a8b33'

function person(patch: Partial<SignInUser> = {}): SignInUser {
  return {
    id: USER,
    email: 'anna@blog.test',
    email_verified: true,
    role: 'member',
    can_publish: true,
    restricted_at: null,
    ...patch,
  }
}

const closed = { registration_open: false, new_members_can_publish: false }
const open = { registration_open: true, new_members_can_publish: true }

describe('decideSignIn', () => {
  it('uid и подтверждённая почта того же участника — вход, почта не подменяется', () => {
    const user = person()
    expect(
      decideSignIn({
        token: { firebase_uid: 'uid-1', email: 'anna@blog.test', email_verified: true, name: 'Чужое' },
        by_uid: user,
        by_email: user,
        settings: closed,
      }),
    ).toEqual({ action: 'login', user, attach_uid: false })
  })

  it('uid уже привязан, подтверждённая почта указывает на другого — вход в учётку uid', () => {
    const owner = person()
    const other = person({ id: OTHER, email: 'other@blog.test' })
    expect(
      decideSignIn({
        token: { firebase_uid: 'uid-1', email: 'other@blog.test', email_verified: true, name: null },
        by_uid: owner,
        by_email: other,
        settings: open,
      }),
    ).toEqual({ action: 'login', user: owner, attach_uid: false })
  })

  it('нет uid, подтверждённая почта совпала — вход и дописывание uid, даже при закрытой регистрации', () => {
    const existing = person({ role: 'superadmin', restricted_at: new Date('2026-01-02T00:00:00.000Z') })
    expect(
      decideSignIn({
        token: { firebase_uid: 'uid-new', email: 'anna@blog.test', email_verified: true, name: 'Анна' },
        by_uid: null,
        by_email: existing,
        settings: closed,
      }),
    ).toEqual({ action: 'login', user: existing, attach_uid: true })
  })

  it('нет uid, почта подтверждена и ничья, регистрация открыта — новый участник', () => {
    expect(
      decideSignIn({
        token: { firebase_uid: 'uid-new', email: 'new@blog.test', email_verified: true, name: 'Новый Участник С Очень Длинным Именем Которое Не Поместится' },
        by_uid: null,
        by_email: null,
        settings: { registration_open: true, new_members_can_publish: false },
      }),
    ).toEqual({
      action: 'create',
      email: 'new@blog.test',
      email_verified: true,
      role: 'member',
      can_publish: false,
      display_name: 'Новый Участник С Очень Длинным Именем Которое Не П',
    })
  })

  it('нет uid и регистрация закрыта — отказ и для подтверждённой ничьей почты, и без почты', () => {
    expect(
      decideSignIn({
        token: { firebase_uid: 'uid-new', email: 'new@blog.test', email_verified: true, name: null },
        by_uid: null,
        by_email: null,
        settings: closed,
      }),
    ).toEqual({ action: 'reject', error: 'registration_closed' })
    expect(
      decideSignIn({
        token: { firebase_uid: 'uid-new', email: null, email_verified: false, name: null },
        by_uid: null,
        by_email: null,
        settings: closed,
      }),
    ).toEqual({ action: 'reject', error: 'registration_closed' })
  })

  it('нет uid, почта не подтверждена, регистрация открыта — новая учётка без адреса', () => {
    expect(
      decideSignIn({
        token: { firebase_uid: 'uid-new', email: 'hidden@blog.test', email_verified: false, name: null },
        by_uid: null,
        by_email: null,
        settings: open,
      }),
    ).toEqual({
      action: 'create',
      email: null,
      email_verified: false,
      role: 'member',
      can_publish: true,
      display_name: 'hidden',
    })
  })

  it('неподтверждённый адрес не открывает чужую учётку, даже если почта совпала бы', () => {
    const existing = person({ email: 'hidden@blog.test' })
    expect(
      decideSignIn({
        token: { firebase_uid: 'uid-new', email: 'hidden@blog.test', email_verified: false, name: null },
        by_uid: null,
        by_email: existing,
        settings: open,
      }).action,
    ).toBe('create')
  })
})

describe('displayNameFromEmail', () => {
  it('берёт часть до @ и обрезает до 50', () => {
    expect(displayNameFromEmail('anna@blog.test')).toBe('anna')
    expect(displayNameFromEmail(`${'a'.repeat(80)}@blog.test`)).toHaveLength(50)
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

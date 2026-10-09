import { describe, expect, it } from 'vitest'
import { requireVerifiedEmail, serviceContextSchema } from '../src/index.ts'

describe('requireVerifiedEmail', () => {
  it('ложь отклоняет мутацию', () => {
    expect(requireVerifiedEmail({ email_verified: false })).toEqual({ allowed: false, code: 'email_unverified' })
  })

  it('истина пропускает', () => {
    expect(requireVerifiedEmail({ email_verified: true })).toEqual({ allowed: true })
  })

  it('отсутствие поля после разбора схемы с умолчанием true пропускает', () => {
    const parsed = serviceContextSchema.parse({
      role: 'member',
      is_restricted: false,
      can_publish: true,
      viewer_key: 'user:3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22',
      user_id: '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22',
    })
    expect(parsed.email_verified).toBe(true)
    expect(requireVerifiedEmail(parsed)).toEqual({ allowed: true })
  })
})

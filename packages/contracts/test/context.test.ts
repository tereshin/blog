import { describe, expect, it } from 'vitest'
import {
  SessionRevokedV1,
  claimsToContext,
  contextToClaims,
  serviceJwtClaimsSchema,
} from '../src/index.ts'

const member = {
  user_id: '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22',
  role: 'member',
  is_restricted: false,
  can_publish: true,
  viewer_key: 'user:3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22',
} as const

describe('служебный контекст', () => {
  it('claims ↔ контекст без потерь для участника', () => {
    const claims = contextToClaims(member, 1_000)
    expect(claims.sub).toBe(member.user_id)
    expect(claimsToContext(serviceJwtClaimsSchema.parse(claims))).toEqual(member)
  })

  it('у гостя sub = viewer_key, user_id нет', () => {
    const guest = { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:abc' } as const
    const context = claimsToContext(serviceJwtClaimsSchema.parse(contextToClaims(guest, 1_000)))
    expect(context.user_id).toBeUndefined()
    expect(context.viewer_key).toBe('guest:abc')
  })

  it('TTL больше 60 с отвергается', () => {
    const claims = { ...contextToClaims(member, 1_000), exp: 1_061 }
    expect(serviceJwtClaimsSchema.safeParse(claims).success).toBe(false)
  })

  it('contextToClaims ограничивает TTL 60 с', () => {
    const claims = contextToClaims(member, 1_000, 600)
    expect(claims.exp - claims.iat).toBe(60)
  })
})

describe('identity.session.revoked', () => {
  it('принимает корректное событие', () => {
    const event = {
      event_id: '0b9f6a6e-6f0c-4f64-9d84-6d2f0f8d1c11',
      name: 'identity.session.revoked',
      occurred_at: '2026-10-08T12:00:00.000Z',
      correlation_id: 'c-1',
      causation_id: null,
      version: 1,
      session_ids: ['s1', 's2'],
      user_id: member.user_id,
    }
    expect(SessionRevokedV1.parse(event)).toEqual(event)
  })
})

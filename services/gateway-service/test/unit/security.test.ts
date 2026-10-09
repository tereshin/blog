import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, imageOrigin } from '../../src/modules/security/content-security-policy.ts'
import { rateLimitForPath } from '../../src/modules/security/rate-limit.ts'

describe('лимиты gateway', () => {
  it('ужесточает вход, реакции, комментарии, файлы и диалоги', () => {
    expect(rateLimitForPath('/v1/auth/google')).toBe(30)
    expect(rateLimitForPath('/v1/reactions')).toBe(60)
    expect(rateLimitForPath('/v1/articles/abc/comments')).toBe(30)
    expect(rateLimitForPath('/v1/media/uploads')).toBe(30)
    expect(rateLimitForPath('/v1/conversations/1/messages')).toBe(60)
    expect(rateLimitForPath('/v1/feed')).toBe(600)
  })
})

describe('CSP', () => {
  it('разрешает только свой origin, nonce и картинки хранилища, без unsafe-inline и unsafe-eval', () => {
    const policy = contentSecurityPolicy({ nonce: 'abc', image_origin: imageOrigin('http://localhost:9000/media') })
    expect(policy).toContain("default-src 'self'")
    expect(policy).toContain("script-src 'self' 'nonce-abc'")
    expect(policy).toContain('http://localhost:9000')
    expect(policy).toContain('data:')
    expect(policy).toContain('https://www.youtube.com')
    expect(policy).not.toContain('unsafe-inline')
    expect(policy).not.toContain('unsafe-eval')
  })
})

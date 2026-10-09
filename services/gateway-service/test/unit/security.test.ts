import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, imageOrigin } from '../../src/modules/security/content-security-policy.ts'
import { rateLimitForPath, rateLimitGroup } from '../../src/modules/security/rate-limit.ts'

describe('лимиты gateway', () => {
  it('ужесточает вход, реакции, комментарии, файлы и диалоги', () => {
    expect(rateLimitForPath('/v1/auth/sessions')).toBe(30)
    expect(rateLimitForPath('/v1/reactions')).toBe(60)
    expect(rateLimitForPath('/v1/articles/abc/comments')).toBe(30)
    expect(rateLimitForPath('/v1/media/uploads')).toBe(30)
    expect(rateLimitForPath('/v1/conversations/1/messages')).toBe(60)
    expect(rateLimitForPath('/v1/feed')).toBe(600)
  })

  it('чтение сессии и конфигурации входа не делит корзину с мутациями входа', () => {
    expect(rateLimitForPath('/v1/auth/session')).toBe(600)
    expect(rateLimitForPath('/v1/auth/config')).toBe(600)
    expect(rateLimitGroup('/v1/auth/session')).toBe('default')
    expect(rateLimitGroup('/v1/auth/sessions')).toBe('auth')
    expect(rateLimitGroup('/v1/feed')).toBe('default')
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
    expect(policy).toContain('https://identitytoolkit.googleapis.com')
    expect(policy).toContain('https://securetoken.googleapis.com')
    expect(policy).toContain('https://accounts.google.com')
    expect(policy).toContain('https://github.com')
    expect(policy).not.toContain('unsafe-inline')
    expect(policy).not.toContain('unsafe-eval')
    expect(policy.split(' ').includes('https:')).toBe(false)
  })

  it('в local добавляет origin auth_domain и эмулятора и в connect-src, и в frame-src', () => {
    const policy = contentSecurityPolicy({
      nonce: 'abc',
      image_origin: null,
      auth_domain: 'demo-blog.firebaseapp.com',
      emulator_host: 'firebase-auth.localhost:9099',
    })
    expect(policy).toContain('connect-src \'self\' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com http://firebase-auth.localhost:9099')
    expect(policy).toContain('https://demo-blog.firebaseapp.com')
    expect(policy).toContain('http://firebase-auth.localhost:9099')
    expect(policy.split(' ').includes('https:')).toBe(false)
  })
})

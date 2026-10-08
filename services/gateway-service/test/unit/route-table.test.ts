import { describe, expect, it } from 'vitest'
import { filterRequestHeaders, filterResponseHeaders, limitBytes, PayloadTooLargeError, resolveRoute } from '../../src/modules/proxy/index.ts'

describe('resolveRoute', () => {
  it.each([
    ['/v1/auth/google/start', 'identity'],
    ['/v1/feed?mode=fresh', 'content'],
    ['/v1/feed/popular', 'content'],
    ['/v1/feed-seen', 'discussion'],
    ['/v1/me/article-states', 'discussion'],
    ['/v1/conversations/1', 'messaging'],
    ['/v1/notifications', 'notification'],
    ['/v1/media', 'media'],
    ['/v1/articles/7a1c2d30-1111-4a11-8a11-000000000010', 'content'],
    ['/v1/articles/7a1c2d30-1111-4a11-8a11-000000000010/comments', 'discussion'],
    ['/v1/articles/7a1c2d30-1111-4a11-8a11-000000000010/comments?cursor=abc', 'discussion'],
  ])('%s → %s', (path, service) => {
    expect(resolveRoute(path)?.service).toBe(service)
  })

  it('неизвестный префикс и /internal недоступны', () => {
    expect(resolveRoute('/v1/unknown')).toBeNull()
    expect(resolveRoute('/internal/sessions/1')).toBeNull()
    expect(resolveRoute('/v1/feedback')).toBeNull()
  })

  it('media получает увеличенные лимиты', () => {
    expect(resolveRoute('/v1/media')?.max_body_bytes).toBeGreaterThan(1024 * 1024)
  })
})

describe('фильтры заголовков', () => {
  it('сервисам не уходят cookie, authorization и поддельный контекст', () => {
    const result = filterRequestHeaders({
      cookie: 'blog_session=x',
      authorization: 'Bearer y',
      'x-service-context': 'forged',
      'x-session-id': 'forged',
      'x-set-session': 'forged',
      accept: 'application/json',
    })
    expect(result).toEqual({ accept: 'application/json' })
  })

  it('клиенту не уходят set-cookie сервисов и внутренние заголовки моста', () => {
    const result = filterResponseHeaders({
      'set-cookie': 'a=b',
      'x-set-session': 'id',
      'x-clear-session': '1',
      'content-type': 'application/json',
    })
    expect(result).toEqual({ 'content-type': 'application/json' })
  })
})

describe('limitBytes', () => {
  it('пропускает тело в пределах лимита и обрывает превышение', async () => {
    const stream = limitBytes(5)
    const errors: unknown[] = []
    stream.on('error', (error) => errors.push(error))
    stream.write(Buffer.from('1234'))
    stream.write(Buffer.from('56'))
    await new Promise((resolve) => setImmediate(resolve))
    expect(errors[0]).toBeInstanceOf(PayloadTooLargeError)
  })
})

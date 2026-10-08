import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, buildUrl, http, readCsrfToken, sessionEvents, shouldRetryQuery } from '@/shared/api'

const okSchema = z.object({ ok: z.boolean() })

function mockFetch(response: Response) {
  const fetch_mock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetch_mock)
  return fetch_mock
}

function callOf(fetch_mock: ReturnType<typeof vi.fn>): { url: string; init: RequestInit & { headers: Record<string, string> } } {
  const [url, init] = fetch_mock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
  return { url, init }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'blog_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

describe('http-client', () => {
  it('отправляет cookie, не добавляет CSRF и ключ идемпотентности к чтению', async () => {
    const fetch_mock = mockFetch(Response.json({ ok: true }))
    await http.get('/v1/topics', okSchema)
    const { init } = callOf(fetch_mock)
    expect(init.credentials).toBe('include')
    expect(init.headers['X-CSRF-Token']).toBeUndefined()
    expect(init.headers['X-Idempotency-Key']).toBeUndefined()
  })

  it('мутация несёт CSRF из cookie и новый ключ идемпотентности', async () => {
    document.cookie = 'blog_csrf=token-123'
    const fetch_mock = mockFetch(Response.json({ ok: true }))
    await http.post('/v1/reactions', okSchema, { body: { kind: 'like' } })
    const { init } = callOf(fetch_mock)
    expect(init.headers['X-CSRF-Token']).toBe('token-123')
    expect(init.headers['X-Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
    expect(init.body).toBe('{"kind":"like"}')
  })

  it('повтор мутации может нести прежний ключ', async () => {
    const fetch_mock = mockFetch(Response.json({ ok: true }))
    await http.post('/v1/x', okSchema, { idempotency_key: 'same-key' })
    expect(callOf(fetch_mock).init.headers['X-Idempotency-Key']).toBe('same-key')
  })

  it('разбирает problem+json в ApiError', async () => {
    mockFetch(
      new Response(JSON.stringify({ code: 'slug_taken', title: 'Адрес занят', detail: 'Выберите другой', request_id: 'r1' }), {
        status: 409,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    )
    const error = await http.get('/v1/x', okSchema).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'slug_taken', status: 409, detail: 'Выберите другой', request_id: 'r1', message: 'Адрес занят' })
  })

  it('ответ без problem+json всё равно становится ApiError со статусом', async () => {
    mockFetch(new Response('<html>bad gateway</html>', { status: 502 }))
    await expect(http.get('/v1/x', okSchema)).rejects.toMatchObject({ code: 'http_502', status: 502 })
  })

  it('401 сообщает об истечении сессии', async () => {
    mockFetch(new Response(JSON.stringify({ code: 'unauthorized' }), { status: 401 }))
    const expired = vi.fn()
    const off = sessionEvents.on('expired', expired)
    await expect(http.get('/v1/x', okSchema)).rejects.toMatchObject({ status: 401 })
    off()
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it('сетевая ошибка — ApiError со статусом 0, а отмена пробрасывается как есть', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(http.get('/v1/x', okSchema)).rejects.toMatchObject({ code: 'network_error', status: 0 })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')))
    await expect(http.get('/v1/x', okSchema)).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('ответ не по схеме отклоняется на границе', async () => {
    mockFetch(Response.json({ ok: 'yes' }))
    await expect(http.get('/v1/x', okSchema)).rejects.toThrow()
  })

  it('строит адрес с параметрами и пропускает пустые', () => {
    expect(buildUrl('/v1/feed', { mode: 'fresh', cursor: undefined, limit: 20, flag: false })).toBe('/v1/feed?mode=fresh&limit=20&flag=false')
  })

  it('читает CSRF-токен из cookie', () => {
    expect(readCsrfToken('a=1; blog_csrf=abc%3D; b=2')).toBe('abc=')
    expect(readCsrfToken('a=1')).toBe('')
  })

  it('повторяет запросы только при сбое сети или сервера и не более двух раз', () => {
    const server = new ApiError({ code: 'x', status: 503, message: '' })
    const client = new ApiError({ code: 'x', status: 404, message: '' })
    expect(shouldRetryQuery(0, server)).toBe(true)
    expect(shouldRetryQuery(2, server)).toBe(false)
    expect(shouldRetryQuery(0, client)).toBe(false)
  })
})

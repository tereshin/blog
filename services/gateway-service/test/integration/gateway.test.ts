import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { generateKeyPairSync } from 'node:crypto'
import type { KeyObject } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { jwtVerify } from 'jose'
import type { FastifyInstance } from 'fastify'
import { createLogger } from '@blog/logger'
import { createServiceMetrics } from '@blog/telemetry'
import { buildApp } from '../../src/app.ts'
import { loadEnv } from '../../src/config/env.ts'
import { EventsService } from '../../src/modules/events/index.ts'
import { ProxyService } from '../../src/modules/proxy/index.ts'
import { SessionService, createContextSigner, createIdentityLookup } from '../../src/modules/session/index.ts'
import { createServiceClient } from '@blog/http-kit'

const USER_ID = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const ARTICLE_ID = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
const SESSION_ID = 'valid_session_id_0123456789'

type Seen = { url: string; method: string; headers: IncomingMessage['headers']; body: string }

function listen(handler: (req: IncomingMessage, res: ServerResponse, body: string) => void, seen: Seen[]): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString()
        seen.push({ url: req.url ?? '', method: req.method ?? '', headers: req.headers, body })
        handler(req, res, body)
      })
    })
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }))
  })
}

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'content-type': 'application/json', ...headers })
  res.end(JSON.stringify(body))
}

describe('gateway: сессия, прокси, поток событий', () => {
  const identity_seen: Seen[] = []
  const content_seen: Seen[] = []
  const servers: Server[] = []
  let app: FastifyInstance
  let events: EventsService
  let base_url: string
  let public_key: KeyObject

  beforeAll(async () => {
    const pair = generateKeyPairSync('ed25519')
    public_key = pair.publicKey

    const identity = await listen((req, res) => {
      if (req.url === `/internal/sessions/${SESSION_ID}`) {
        json(res, 200, { user_id: USER_ID, role: 'member', is_restricted: false, can_publish: true })
      } else if (req.url?.startsWith('/internal/sessions/')) {
        json(res, 404, { code: 'not_found' })
      } else if (req.url === '/v1/auth/callback') {
        json(res, 200, { ok: true }, { 'x-set-session': 'new_session_id_0123456789', 'x-set-session-max-age': '3600', 'set-cookie': 'evil=1' })
      } else {
        json(res, 200, { ok: true })
      }
    }, identity_seen)
    const content = await listen((_req, res) => json(res, 200, { items: [] }), content_seen)
    servers.push(identity.server, content.server)

    const logger = createLogger({ service: 'gateway-test', level: 'silent' })
    const env = loadEnv({
      APP_ENV: 'local',
      PUBLIC_ORIGIN: 'http://localhost:8080',
      WEB_ORIGIN: 'http://localhost:8080',
      SESSION_COOKIE_NAME: 'blog_session',
      GUEST_COOKIE_NAME: 'blog_guest',
      CSRF_COOKIE_NAME: 'blog_csrf',
      SERVICE_JWT_PRIVATE_KEY: 'unused-in-test',
      IDENTITY_URL: identity.url,
      CONTENT_URL: content.url,
      DISCUSSION_URL: 'http://127.0.0.1:1',
      MESSAGING_URL: 'http://127.0.0.1:1',
      NOTIFICATION_URL: 'http://127.0.0.1:1',
      MEDIA_URL: 'http://127.0.0.1:1',
      NATS_URL: 'nats://unused',
    })
    const identity_client = createServiceClient({ name: 'identity', base_url: identity.url, max_retries: 0 })
    events = new EventsService(
      async (_jwt, article_id) => ({ can_read: article_id === ARTICLE_ID, visibility: 'public', status: 'published', author_id: USER_ID }),
      logger,
    )
    app = await buildApp({
      env,
      logger,
      metrics: createServiceMetrics('gateway_test'),
      sessions: new SessionService(createIdentityLookup(identity_client)),
      signer: createContextSigner(pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()),
      proxy: new ProxyService({
        identity: identity.url,
        content: content.url,
        discussion: 'http://127.0.0.1:1',
        messaging: 'http://127.0.0.1:1',
        notification: 'http://127.0.0.1:1',
        media: 'http://127.0.0.1:1',
      }),
      content: createServiceClient({ name: 'content', base_url: content.url, max_retries: 0 }),
      events,
      is_broker_ready: () => true,
    })
    base_url = await app.listen({ port: 0, host: '127.0.0.1' })
  })

  afterAll(async () => {
    for (const connection of events.registry.all()) connection.close()
    await app.close()
    for (const server of servers) server.close()
  })

  it('гость: сервис получает подписанный контекст гостя и не видит cookie', async () => {
    content_seen.length = 0
    const response = await fetch(`${base_url}/v1/feed?mode=fresh`, { headers: { cookie: 'tracking=secret' } })
    expect(response.status).toBe(200)
    const upstream = content_seen.at(-1)
    expect(upstream?.url).toBe('/v1/feed?mode=fresh')
    expect(upstream?.headers['cookie']).toBeUndefined()
    const { payload } = await jwtVerify(String(upstream?.headers['x-service-context']), public_key, { algorithms: ['EdDSA'] })
    expect(payload['role']).toBe('guest')
    expect(String(payload['viewer_key'])).toMatch(/^guest:/)
    const set_cookie = response.headers.getSetCookie().join('\n')
    expect(set_cookie).toMatch(/blog_guest=.*HttpOnly/i)
    expect(set_cookie).toMatch(/blog_csrf=/)
    expect(set_cookie).not.toMatch(/blog_csrf=[^;]*;.*HttpOnly/i)
  })

  it('подделанный X-Service-Context клиента не доходит до сервиса', async () => {
    content_seen.length = 0
    await fetch(`${base_url}/v1/feed`, { headers: { 'x-service-context': 'forged' } })
    expect(content_seen.at(-1)?.headers['x-service-context']).not.toBe('forged')
  })

  it('мутация без CSRF-токена — 403, с токеном — доходит потоком', async () => {
    content_seen.length = 0
    const denied = await fetch(`${base_url}/v1/follows`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"a":1}' })
    expect(denied.status).toBe(403)
    expect(content_seen).toHaveLength(0)

    const token = 'csrf-token-value'
    const allowed = await fetch(`${base_url}/v1/follows`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `blog_csrf=${token}`, 'x-csrf-token': token, 'x-idempotency-key': 'k1' },
      body: '{"target_id":"x"}',
    })
    expect(allowed.status).toBe(200)
    expect(content_seen.at(-1)?.body).toBe('{"target_id":"x"}')
    expect(content_seen.at(-1)?.headers['x-idempotency-key']).toBe('k1')
  })

  it('действительная сессия даёт контекст участника', async () => {
    content_seen.length = 0
    await fetch(`${base_url}/v1/feed`, { headers: { cookie: `blog_session=${SESSION_ID}` } })
    const { payload } = await jwtVerify(String(content_seen.at(-1)?.headers['x-service-context']), public_key, { algorithms: ['EdDSA'] })
    expect(payload['sub']).toBe(USER_ID)
    expect(payload['role']).toBe('member')
  })

  it('отозванная сессия понижается до гостя, cookie очищается', async () => {
    content_seen.length = 0
    const response = await fetch(`${base_url}/v1/feed`, { headers: { cookie: 'blog_session=revoked_session_id_0123456' } })
    const { payload } = await jwtVerify(String(content_seen.at(-1)?.headers['x-service-context']), public_key, { algorithms: ['EdDSA'] })
    expect(payload['role']).toBe('guest')
    expect(response.headers.getSetCookie().join('\n')).toMatch(/blog_session=;/)
  })

  it('мост сессий: identity просит поставить cookie, внутренние заголовки и set-cookie сервиса скрыты', async () => {
    const response = await fetch(`${base_url}/v1/auth/callback`)
    const cookies = response.headers.getSetCookie().join('\n')
    expect(cookies).toMatch(/blog_session=new_session_id_0123456789/)
    expect(cookies).toMatch(/HttpOnly/i)
    expect(cookies).toMatch(/Secure/i)
    expect(cookies).toMatch(/SameSite=Lax/i)
    expect(cookies).not.toMatch(/evil=1/)
    expect(response.headers.get('x-set-session')).toBeNull()
  })

  it('identity получает идентификатор сессии, остальные сервисы — нет', async () => {
    identity_seen.length = 0
    content_seen.length = 0
    await fetch(`${base_url}/v1/auth/session`, { headers: { cookie: `blog_session=${SESSION_ID}` } })
    await fetch(`${base_url}/v1/feed`, { headers: { cookie: `blog_session=${SESSION_ID}` } })
    expect(identity_seen.find((item) => item.url === '/v1/auth/session')?.headers['x-session-id']).toBe(SESSION_ID)
    expect(content_seen.at(-1)?.headers['x-session-id']).toBeUndefined()
  })

  it('/internal/* снаружи — 404, неизвестный префикс — 404 problem+json', async () => {
    expect((await fetch(`${base_url}/internal/sessions/${SESSION_ID}`)).status).toBe(404)
    const unknown = await fetch(`${base_url}/v1/unknown`)
    expect(unknown.status).toBe(404)
    expect(unknown.headers.get('content-type')).toMatch(/application\/problem\+json/)
  })

  it('недоступный сервис — 503 problem+json, а не обрыв', async () => {
    const response = await fetch(`${base_url}/v1/comments?article_id=${ARTICLE_ID}`)
    expect(response.status).toBe(503)
    expect(response.headers.get('content-type')).toMatch(/application\/problem\+json/)
    expect((await response.json() as { code: string }).code).toBe('service_unavailable')
  })

  it('health не требует контекста и не создаёт cookie', async () => {
    const response = await fetch(`${base_url}/health/ready`)
    expect(response.status).toBe(200)
    expect(response.headers.getSetCookie()).toHaveLength(0)
  })

  it('поток: hello с connection_id, подписка на статью, кадр после события без текста', async () => {
    const stream = await fetch(`${base_url}/v1/events`, { headers: { accept: 'text/event-stream' } })
    expect(stream.headers.get('content-type')).toMatch(/text\/event-stream/)
    const reader = stream.body?.getReader()
    if (!reader) throw new Error('нет тела потока')
    const decoder = new TextDecoder()
    let buffer = ''
    const nextFrame = async (): Promise<Record<string, unknown>> => {
      for (;;) {
        const match = /data: (.*)\n\n/.exec(buffer)
        if (match) {
          buffer = buffer.slice((match.index ?? 0) + match[0].length)
          return JSON.parse(match[1] ?? '{}') as Record<string, unknown>
        }
        const chunk = await reader.read()
        if (chunk.done) throw new Error('поток закрыт')
        buffer += decoder.decode(chunk.value)
      }
    }

    const hello = await nextFrame()
    expect(hello['type']).toBe('hello')
    const connection_id = String(hello['connection_id'])
    const cookies = stream.headers.getSetCookie().map((item) => item.split(';')[0]).join('; ')
    const csrf = /blog_csrf=([^;]+)/.exec(cookies)?.[1] ?? ''

    const subscribed = await fetch(`${base_url}/v1/events/subscriptions`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie: cookies, 'x-csrf-token': csrf },
      body: JSON.stringify({ connection_id, article_ids: [ARTICLE_ID, '11111111-1111-4111-8111-111111111111'] }),
    })
    if (subscribed.status !== 200) throw new Error(`PUT ${subscribed.status}: ${await subscribed.text()} | cookies=${cookies}`)
    // Статья вне доступа в подписку не попадает.
    expect(await subscribed.json()).toEqual({ article_ids: [ARTICLE_ID] })

    const delivered = events.dispatch({
      name: 'discussion.comment.created',
      occurred_at: '2026-10-08T12:00:00.000Z',
      article_id: ARTICLE_ID,
      comment_id: '22222222-2222-4222-8222-222222222222',
      body: 'не должно попасть в кадр',
    })
    expect(delivered).toBe(1)
    expect(await nextFrame()).toEqual({
      type: 'comment',
      article_id: ARTICLE_ID,
      comment_id: '22222222-2222-4222-8222-222222222222',
      occurred_at: '2026-10-08T12:00:00.000Z',
    })
    await reader.cancel()
  })
})

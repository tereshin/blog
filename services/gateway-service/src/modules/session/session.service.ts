import { LRUCache } from 'lru-cache'
import { profileSchema, serviceContextSchema, sessionResponseSchema } from '@blog/contracts'
import type { Role, ServiceContext, SessionResponse } from '@blog/contracts'
import { resolveRoute } from '../../shared/route-table.ts'
import { IdentityMemberSchema } from './session.schema.ts'
import type {
  ResolvedViewer,
  SessionInfo,
  SessionLookupPort,
  UpstreamForwardPort,
  UpstreamResponse,
  ViewerSession,
} from './session.types.ts'

export const SESSION_CACHE_TTL_MS = 30_000
const SESSION_CACHE_MAX = 10_000
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/

/** Идентификатор в cookie попадает в путь запроса к identity: принимаем только безопасный алфавит. */
export function isValidSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(value)
}

function hasControlChar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) <= 31) return true
  }
  return false
}

/** Только относительный путь: чужой origin и `//host` ведут на главную. */
export function safeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || hasControlChar(value)) return '/'
  return value
}

export function guestContext(guest_id: string): ServiceContext {
  return { role: 'guest', is_restricted: false, can_publish: false, viewer_key: `guest:${guest_id}`, email_verified: true }
}

export function memberContext(info: SessionInfo): ServiceContext {
  const role: Role = info.role
  return serviceContextSchema.parse({
    user_id: info.user_id,
    role,
    is_restricted: info.is_restricted,
    can_publish: info.can_publish,
    viewer_key: `user:${info.user_id}`,
    email_verified: info.email_verified,
  })
}

async function readJson(body: UpstreamResponse['body']): Promise<unknown> {
  const text = await body.text()
  if (!text) return null
  return JSON.parse(text) as unknown
}

/** LRU-кэш сессий на 30 с; сброс по `identity.session.revoked`. Ошибка identity не кэшируется. */
export class SessionService {
  private readonly cache: LRUCache<string, { info: SessionInfo | null }>

  constructor(
    private readonly lookup: SessionLookupPort,
    private readonly upstream: UpstreamForwardPort,
    ttl_ms: number = SESSION_CACHE_TTL_MS,
  ) {
    this.cache = new LRUCache({ max: SESSION_CACHE_MAX, ttl: ttl_ms })
  }

  async resolve(session_id: string): Promise<SessionInfo | null> {
    const cached = this.cache.get(session_id)
    if (cached) return cached.info
    const info = await this.lookup.find(session_id)
    this.cache.set(session_id, { info })
    return info
  }

  invalidate(session_ids: readonly string[]): void {
    for (const id of session_ids) this.cache.delete(id)
  }

  /** Cookie → контекст. Просроченная сессия понижается до гостя, cookie помечается к очистке. */
  async resolveViewer(guest_id: string, session_cookie: string | undefined): Promise<ResolvedViewer> {
    if (!session_cookie) return { context: guestContext(guest_id), session_id: null, should_clear_cookie: false }
    const info = isValidSessionId(session_cookie) ? await this.resolve(session_cookie) : null
    if (!info) return { context: guestContext(guest_id), session_id: null, should_clear_cookie: true }
    return { context: memberContext(info), session_id: session_cookie, should_clear_cookie: false }
  }

  /** Участник из identity и карточка профиля из content; любой сбой — ответ гостя. */
  async readSession(viewer: ViewerSession, headers: Record<string, string>): Promise<SessionResponse> {
    if (!viewer.session_id || viewer.context.role === 'guest') return sessionResponseSchema.parse({ status: 'guest' })
    const upstream = await this.forwardTo('GET', '/v1/auth/session', headers)
    if (!upstream || upstream.status !== 200) return sessionResponseSchema.parse({ status: 'guest' })
    const parsed = IdentityMemberSchema.safeParse(await readJson(upstream.body))
    if (!parsed.success) return sessionResponseSchema.parse({ status: 'guest' })

    let profile = {
      display_name: parsed.data.display_name_hint,
      avatar_url: null as string | null,
      slug: String(parsed.data.user.public_number),
    }
    const card = await this.forwardTo('GET', `/v1/profiles/${parsed.data.user.public_number}`, headers)
    if (card && card.status === 200) {
      const full = profileSchema.safeParse(await readJson(card.body))
      if (full.success) {
        profile = {
          display_name: full.data.display_name,
          avatar_url: full.data.avatar_url,
          slug: full.data.slug ?? String(full.data.public_number),
        }
      }
    }
    return sessionResponseSchema.parse({ status: 'member', user: parsed.data.user, profile })
  }

  async logout(session_id: string | null, headers: Record<string, string>): Promise<void> {
    await this.forwardTo('DELETE', '/v1/sessions/current', headers)
    if (session_id) this.invalidate([session_id])
  }

  private async forwardTo(method: 'GET' | 'POST' | 'DELETE', url: string, headers: Record<string, string>): Promise<UpstreamResponse | null> {
    const entry = resolveRoute(url)
    if (!entry) return null
    return this.upstream.forward({ entry, method, url, headers, body: undefined, content_length: undefined })
  }
}

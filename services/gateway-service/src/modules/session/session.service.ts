import { createPrivateKey } from 'node:crypto'
import { SignJWT } from 'jose'
import type { CryptoKey, KeyObject } from 'jose'
import { LRUCache } from 'lru-cache'
import { contextToClaims, serviceContextSchema, SERVICE_JWT_MAX_TTL_SECONDS } from '@blog/contracts'
import type { Role, ServiceContext } from '@blog/contracts'
import { normalizePem, SERVICE_JWT_ALG } from '@blog/http-kit'
import type { ServiceClient } from '@blog/http-kit'
import { z } from 'zod'
import type { SessionInfo, SessionLookup } from './session.types.ts'

export const SESSION_CACHE_TTL_MS = 30_000
const SESSION_CACHE_MAX = 10_000
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/

const sessionInfoSchema = z.object({
  user_id: z.uuid(),
  role: z.enum(['member', 'admin', 'superadmin']),
  is_restricted: z.boolean(),
  can_publish: z.boolean(),
})

/** Идентификатор в cookie попадает в путь запроса к identity: принимаем только безопасный алфавит. */
export function isValidSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(value)
}

export function guestContext(guest_id: string): ServiceContext {
  return { role: 'guest', is_restricted: false, can_publish: false, viewer_key: `guest:${guest_id}` }
}

export function memberContext(info: SessionInfo): ServiceContext {
  const role: Role = info.role
  return serviceContextSchema.parse({
    user_id: info.user_id,
    role,
    is_restricted: info.is_restricted,
    can_publish: info.can_publish,
    viewer_key: `user:${info.user_id}`,
  })
}

/** Запрос к identity: `GET /internal/sessions/{id}`; 404 — сессии нет. */
export function createIdentityLookup(client: ServiceClient): SessionLookup {
  return async (session_id) => {
    const response = await client.request({ path: `/internal/sessions/${session_id}` })
    if (response.status === 404) return null
    if (response.status !== 200) throw new Error(`identity: неожиданный ответ ${response.status}`)
    return sessionInfoSchema.parse(response.body)
  }
}

/** LRU-кэш сессий на 30 с; сброс по `identity.session.revoked`. Ошибка identity не кэшируется. */
export class SessionService {
  private readonly cache: LRUCache<string, { info: SessionInfo | null }>

  constructor(
    private readonly lookup: SessionLookup,
    ttl_ms: number = SESSION_CACHE_TTL_MS,
  ) {
    this.cache = new LRUCache({ max: SESSION_CACHE_MAX, ttl: ttl_ms })
  }

  async resolve(session_id: string): Promise<SessionInfo | null> {
    const cached = this.cache.get(session_id)
    if (cached) return cached.info
    const info = await this.lookup(session_id)
    this.cache.set(session_id, { info })
    return info
  }

  invalidate(session_ids: readonly string[]): void {
    for (const id of session_ids) this.cache.delete(id)
  }
}

export type ContextSigner = {
  sign: (context: ServiceContext) => Promise<string>
}

/** Подписывает служебный контекст (EdDSA), TTL ≤ 60 с. */
export function createContextSigner(private_key_pem: string, now: () => number = Date.now): ContextSigner {
  const key: KeyObject | CryptoKey = createPrivateKey(normalizePem(private_key_pem))
  return {
    sign: (context) => {
      const claims = contextToClaims(context, Math.floor(now() / 1000), SERVICE_JWT_MAX_TTL_SECONDS / 2)
      return new SignJWT({ ...claims }).setProtectedHeader({ alg: SERVICE_JWT_ALG }).sign(key)
    },
  }
}

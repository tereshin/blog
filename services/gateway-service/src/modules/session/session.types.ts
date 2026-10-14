import type { Role, ServiceContext } from '@blog/contracts'
import type { RouteEntry } from '../../shared/route-table.ts'

/** Ответ `GET /internal/sessions/{id}` сервиса identity. */
export type SessionInfo = {
  user_id: string
  role: Exclude<Role, 'guest'>
  is_restricted: boolean
  can_publish: boolean
  email_verified: boolean
}

/** Поиск сессии у владельца; `null` — сессия отозвана, истекла или не существует. */
export type SessionLookupPort = {
  find: (session_id: string) => Promise<SessionInfo | null>
}

export type UpstreamRequest = {
  entry: RouteEntry
  method: 'GET' | 'POST' | 'DELETE'
  url: string
  headers: Record<string, string>
  body: undefined
  content_length: undefined
}

export type UpstreamResponse = {
  status: number
  body: { text: () => Promise<string> }
}

/** Порт пересылки запроса сервису-владельцу пути; реализацию (прокси) подставляет app.ts. */
export type UpstreamForwardPort = {
  forward: (input: UpstreamRequest) => Promise<UpstreamResponse>
}

/** Порт источника событий брокера для `identity.session.revoked`; реализацию (NATS) подставляет main.ts. */
export type RevocationSourcePort = {
  subscribe: (subject: string) => AsyncIterable<{ json: () => unknown }> & { unsubscribe: () => void }
}

/** Контекст зрителя по cookie запроса; `should_clear_cookie` — cookie сессии устарела. */
export type ResolvedViewer = {
  context: ServiceContext
  session_id: string | null
  should_clear_cookie: boolean
}

/** Что gateway знает о зрителе текущего запроса. */
export type ViewerSession = {
  context: ServiceContext
  /** Идентификатор серверной сессии; `null` у гостя. Наружу к сервисам не уходит, кроме identity. */
  session_id: string | null
  /** Подписанный служебный JWT для заголовка `X-Service-Context`. */
  service_context_jwt: string
}

declare module 'fastify' {
  interface FastifyRequest {
    viewer_session: ViewerSession
  }
}

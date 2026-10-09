import type { Role, ServiceContext } from '@blog/contracts'

/** Ответ `GET /internal/sessions/{id}` сервиса identity. */
export type SessionInfo = {
  user_id: string
  role: Exclude<Role, 'guest'>
  is_restricted: boolean
  can_publish: boolean
  email_verified: boolean
}

/** Поиск сессии у владельца; `null` — сессия отозвана, истекла или не существует. */
export type SessionLookup = (session_id: string) => Promise<SessionInfo | null>

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

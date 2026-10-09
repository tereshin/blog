/** Что identity отдаёт gateway о сессии (контракт `GET /internal/sessions/{id}`). */
export type ActiveSession = {
  user_id: string
  role: 'member' | 'admin' | 'superadmin'
  is_restricted: boolean
  can_publish: boolean
  email_verified: boolean
}

export type SessionRepository = {
  /** Сессия, не отозванная и не истёкшая на момент `now`, вместе с участником. */
  findActive: (session_id: string, now: Date) => Promise<ActiveSession | null>
}

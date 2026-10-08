import { SessionNotFoundError } from './session.errors.ts'
import type { ActiveSession, SessionRepository } from './session.types.ts'

export type SessionService = {
  getActiveSession: (session_id: string) => Promise<ActiveSession>
}

export function createSessionService(repository: SessionRepository, now: () => Date = () => new Date()): SessionService {
  return {
    async getActiveSession(session_id) {
      const session = await repository.findActive(session_id, now())
      if (!session) throw new SessionNotFoundError()
      return session
    },
  }
}

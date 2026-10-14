import { SessionNotFoundError } from './session.errors.ts'
import type { ActiveSession, SessionRepositoryPort } from './session.types.ts'

export class SessionService {
  constructor(
    private readonly repository: SessionRepositoryPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getActiveSession(session_id: string): Promise<ActiveSession> {
    const session = await this.repository.findActive(session_id, this.now())
    if (!session) throw new SessionNotFoundError()
    return session
  }
}

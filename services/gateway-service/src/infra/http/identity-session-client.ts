import { z } from 'zod'
import type { ServiceClient } from '@blog/http-kit'
import type { SessionInfo, SessionLookupPort } from '../../modules/session/index.ts'

const SessionInfoSchema = z.object({
  user_id: z.uuid(),
  role: z.enum(['member', 'admin', 'superadmin']),
  is_restricted: z.boolean(),
  can_publish: z.boolean(),
  email_verified: z.boolean().default(true),
})

/** Запрос к identity: `GET /internal/sessions/{id}`; 404 — сессии нет. */
export class IdentitySessionClient implements SessionLookupPort {
  constructor(private readonly identity: ServiceClient) {}

  async find(session_id: string): Promise<SessionInfo | null> {
    const response = await this.identity.request({ path: `/internal/sessions/${session_id}` })
    if (response.status === 404) return null
    if (response.status !== 200) throw new Error(`identity: неожиданный ответ ${response.status}`)
    return SessionInfoSchema.parse(response.body)
  }
}

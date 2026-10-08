import { z } from 'zod'
import { defineEvent } from '../envelope.ts'

/** Сессии участника отозваны (выход, ограничение): gateway сбрасывает кэш и закрывает потоки. */
export const SessionRevokedV1 = defineEvent('identity.session.revoked', 1, {
  session_ids: z.array(z.string().min(1)),
  user_id: z.uuid(),
})

export type SessionRevokedV1 = z.infer<typeof SessionRevokedV1>

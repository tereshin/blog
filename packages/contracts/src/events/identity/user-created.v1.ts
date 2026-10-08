import { z } from 'zod'
import { defineEvent } from '../envelope.ts'
import { userSnapshotShape } from './user-snapshot.ts'

/** Участник появился на площадке. `display_name` — имя Google или локальная часть почты: из него content создаёт профиль. */
export const UserCreatedV1 = defineEvent('identity.user.created', 1, {
  ...userSnapshotShape,
  display_name: z.string().min(1).max(50),
})

export type UserCreatedV1 = z.infer<typeof UserCreatedV1>

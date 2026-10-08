import type { z } from 'zod'
import { defineEvent } from '../envelope.ts'
import { userSnapshotShape } from './user-snapshot.ts'

/** Изменились роль или право публикации. */
export const UserUpdatedV1 = defineEvent('identity.user.updated', 1, userSnapshotShape)

export type UserUpdatedV1 = z.infer<typeof UserUpdatedV1>

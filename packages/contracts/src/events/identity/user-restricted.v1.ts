import type { z } from 'zod'
import { defineEvent } from '../envelope.ts'
import { userSnapshotShape } from './user-snapshot.ts'

/** Участника ограничили или сняли ограничение (`is_restricted` в снимке — итоговое состояние). */
export const UserRestrictedV1 = defineEvent('identity.user.restricted', 1, userSnapshotShape)

export type UserRestrictedV1 = z.infer<typeof UserRestrictedV1>

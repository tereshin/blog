import { z } from 'zod'
import { defineEvent } from '../envelope.ts'

/** Профиль создан или изменён: копии имени и аватара у discussion, messaging и notification. */
export const ProfileUpdatedV1 = defineEvent('content.profile.updated', 1, {
  user_id: z.uuid(),
  display_name: z.string().min(1).max(50),
  avatar_url: z.string().nullable(),
  slug: z.string().nullable(),
})

export type ProfileUpdatedV1 = z.infer<typeof ProfileUpdatedV1>

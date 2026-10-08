import { z } from 'zod'

/**
 * Снимок участника, который identity рассылает потребителям копий.
 * Одинаков во всех событиях `identity.user.*`: потребитель делает upsert, порядок типов событий ему не важен.
 */
export const userSnapshotShape = {
  user_id: z.uuid(),
  public_number: z.number().int().positive(),
  role: z.enum(['member', 'admin', 'superadmin']),
  can_publish: z.boolean(),
  is_restricted: z.boolean(),
  created_at: z.iso.datetime(),
}

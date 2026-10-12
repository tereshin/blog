import { createHash } from 'node:crypto'
import { z } from 'zod'
import { ValidationError } from '@blog/errors'
import type { ModerationFilters } from '@blog/contracts'
const schema = z.object({
  t: z.iso.datetime(),
  id: z.uuid(),
  scope: z.string(),
  exact: z.boolean().optional(),
})
export type ModerationCursor = z.infer<typeof schema>
export function moderationScope(filters: ModerationFilters, kind: string): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        kind,
        filters.q,
        filters.status,
        filters.sort,
        filters.from,
        filters.to,
        filters.topic_id,
        filters.article_status,
      ]),
    )
    .digest('hex')
}
export function decodeModerationCursor(
  value: string | undefined,
  scope: string,
): ModerationCursor | null {
  if (!value) return null
  try {
    const cursor = schema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
    if (cursor.scope !== scope) throw new Error('Cursor scope mismatch')
    return cursor
  } catch (cause) {
    throw new ValidationError({ message: 'Некорректный курсор', cause })
  }
}
export function encodeModerationCursor(cursor: ModerationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

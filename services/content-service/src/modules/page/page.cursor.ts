import { z } from 'zod'
import type { AdminPagesQuery } from '@blog/contracts'
import { pageError } from './page.errors.ts'
const cursorSchema = z.strictObject({
  created_at: z.iso.datetime(),
  id: z.uuid(),
  status: z.string(),
})
export function encodeCursor(created_at: Date, id: string, status?: string): string {
  return Buffer.from(
    JSON.stringify({ created_at: created_at.toISOString(), id, status: status ?? 'all' }),
  ).toString('base64url')
}
export function decodeCursor(query: AdminPagesQuery) {
  if (!query.cursor) return null
  try {
    const cursor = cursorSchema.parse(
      JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')),
    )
    if (cursor.status !== (query.status ?? 'all')) throw new Error('filter mismatch')
    return cursor
  } catch {
    throw pageError('validation_error', 400)
  }
}

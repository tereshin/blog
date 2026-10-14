import { z } from 'zod'
import { InvalidCursorError } from './notification.errors.ts'

export const NOTIFICATION_PAGE_SIZE = 20

export const NotificationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(NOTIFICATION_PAGE_SIZE).default(NOTIFICATION_PAGE_SIZE),
})
export type NotificationQuery = z.infer<typeof NotificationQuerySchema>

export const NotificationParamsSchema = z.object({ id: z.string() })

const NotificationCursorSchema = z.strictObject({ t: z.iso.datetime(), id: z.uuid() })
export type NotificationCursor = z.infer<typeof NotificationCursorSchema>

export function encodeNotificationCursor(cursor: NotificationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeNotificationCursor(value: string): NotificationCursor {
  try {
    return NotificationCursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  } catch {
    throw new InvalidCursorError()
  }
}

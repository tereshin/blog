import { z } from 'zod'
import { InvalidCursorError } from './notification.errors.ts'

export const NOTIFICATION_PAGE_SIZE = 20

export const notificationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(NOTIFICATION_PAGE_SIZE).default(NOTIFICATION_PAGE_SIZE),
})

const cursorSchema = z.strictObject({ t: z.iso.datetime(), id: z.uuid() })
export type NotificationCursor = z.infer<typeof cursorSchema>

export function encodeNotificationCursor(cursor: NotificationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeNotificationCursor(value: string): NotificationCursor {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  } catch {
    throw new InvalidCursorError()
  }
}

import { z } from 'zod'
import { ValidationError } from '@blog/errors'

const cursorSchema = z.discriminatedUnion('k', [
  z.strictObject({ k: z.literal('time'), t: z.iso.datetime(), id: z.uuid() }),
  z.strictObject({ k: z.literal('score'), s: z.number().int().nonnegative(), id: z.uuid() }),
  z.strictObject({ k: z.literal('follow'), t: z.iso.datetime(), id: z.uuid() }),
  z.strictObject({ k: z.literal('rep'), s: z.number().int(), id: z.uuid() }),
])

export type ProfileCursor = z.infer<typeof cursorSchema>

export function encodeProfileCursor(cursor: ProfileCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeProfileCursor(value: string): ProfileCursor {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  } catch {
    throw new ValidationError({ message: 'Курсор не читается', details: { field: 'cursor' } })
  }
}

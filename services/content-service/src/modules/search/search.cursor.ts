import { z } from 'zod'
import { InvalidSearchCursorError } from './search.errors.ts'

const cursorSchema = z.strictObject({
  r: z.number(),
  t: z.iso.datetime(),
  id: z.uuid(),
})

export type SearchCursor = z.infer<typeof cursorSchema>

export function encodeSearchCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeSearchCursor(value: string): SearchCursor {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  } catch {
    throw new InvalidSearchCursorError()
  }
}

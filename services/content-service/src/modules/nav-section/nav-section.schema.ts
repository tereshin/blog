import { z } from 'zod'
import { navError } from './nav-section.errors.ts'

export function parseNavInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw navError('validation_error', 400, {
      fields: result.error.issues.map((issue) => issue.path.join('.')),
    })
  }
  return result.data
}

export const NavSectionParamsSchema = z.strictObject({ id: z.uuid() })
export const NavSectionItemParamsSchema = z.strictObject({
  id: z.uuid(),
  item_id: z.uuid(),
})

import { z } from 'zod'
import { adminPageSchema, adminPagesSchema, publicPageSchema } from '@blog/contracts'
import { pageError } from './page.errors.ts'
export const PageIdSchema = z.strictObject({ id: z.uuid() })
export const PageSlugSchema = z.strictObject({ slug: z.string().max(40) })
export function parsePageInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success)
    throw pageError('validation_error', 400, {
      fields: result.error.issues.map((issue) => issue.path.join('.')),
    })
  return result.data
}
function jsonSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema, { target: 'draft-7', unrepresentable: 'any' })
}
export const pageResponseSchemas = {
  admin: jsonSchema(adminPageSchema),
  public: jsonSchema(publicPageSchema),
  list: jsonSchema(adminPagesSchema),
}

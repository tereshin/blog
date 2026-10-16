import { z } from 'zod'

export const adminDirectoryQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  cursor: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(101).default(26),
  role: z.enum(['member', 'admin', 'superadmin']).optional(),
  ids: z
    .string()
    .max(4000)
    .optional()
    .transform((value) =>
      value === undefined
        ? undefined
        : z
            .array(z.uuid())
            .max(101)
            .parse(value ? value.split(',') : []),
    ),
})
export type AdminDirectoryQuery = z.infer<typeof adminDirectoryQuerySchema>
export const adminDirectorySchema = z.array(
  z.object({
    user_id: z.uuid(),
    public_number: z.number().int().positive(),
    display_name: z.string(),
    slug: z.string().nullable(),
  }),
)

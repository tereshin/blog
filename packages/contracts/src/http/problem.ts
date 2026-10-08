import { z } from 'zod'

/** Тело ошибки `application/problem+json`; все поля — snake_case. */
export const problemSchema = z.strictObject({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string().optional(),
  request_id: z.string().optional(),
  errors: z.record(z.string(), z.unknown()).optional(),
})

export type ProblemBody = z.infer<typeof problemSchema>

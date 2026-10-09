import { z } from 'zod'

export const reportParamsSchema = z.object({ id: z.uuid() })

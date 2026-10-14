import { z } from 'zod'

export const ReportParamsSchema = z.object({ id: z.uuid() })

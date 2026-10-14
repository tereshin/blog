import { z } from 'zod'
import { articleStatusSchema } from '@blog/contracts'

export const ModerationIdParamsSchema = z.object({ id: z.uuid() })

export const ArticleStatusResponseSchema = z.object({ id: z.uuid(), status: articleStatusSchema })

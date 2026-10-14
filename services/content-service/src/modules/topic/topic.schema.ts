import { z } from 'zod'

export const TopicParamsSchema = z.object({ slug: z.string().min(1).max(60) })
export const TopicIdParamsSchema = z.object({ id: z.uuid() })
export const TopicListQuerySchema = z.object({ include_archived: z.literal('1').optional() })

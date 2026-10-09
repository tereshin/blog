import { z } from 'zod'
import { feedKeySchema, feedSeenSchema } from '@blog/contracts'

export const seenBodySchema = feedSeenSchema
export const seenQuerySchema = z.object({ feed_key: feedKeySchema })

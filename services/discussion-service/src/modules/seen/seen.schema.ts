import { z } from 'zod'
import { feedKeySchema, feedSeenSchema } from '@blog/contracts'

export const SEEN_LIMIT = 500

export const SeenBodySchema = feedSeenSchema
export const SeenQuerySchema = z.object({ feed_key: feedKeySchema })

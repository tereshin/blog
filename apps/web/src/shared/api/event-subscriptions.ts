import { z } from 'zod'

export const FRAME_TYPES = ['article', 'comment', 'reaction', 'bookmark', 'view', 'notification', 'message', 'settings'] as const
export type FrameType = (typeof FRAME_TYPES)[number]

export const frameSchema = z.union([
  z.object({ type: z.literal('hello'), connection_id: z.string() }),
  z.object({
    type: z.enum(FRAME_TYPES),
    article_id: z.string().optional(),
    comment_id: z.string().optional(),
    conversation_id: z.string().optional(),
    notification_id: z.string().optional(),
    occurred_at: z.string(),
  }),
])

export type LiveFrame = Exclude<z.infer<typeof frameSchema>, { type: 'hello' }>

export type StreamSubscription = {
  article_ids?: readonly string[]
  feed_key?: string
  conversation_ids?: readonly string[]
  notifications?: boolean
}

export type MergedSubscription = { article_ids: string[]; feed_key?: string; conversation_ids: string[]; notifications: boolean }

export type EventSourceLike = {
  listen(on_message: (data: string) => void, on_error: () => void): void
  close(): void
}
export type EventSourceFactory = (url: string) => EventSourceLike

const BASE_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 30_000

export function mergeSubscriptions(parts: Iterable<StreamSubscription>): MergedSubscription {
  const article_ids = new Set<string>()
  const conversation_ids = new Set<string>()
  const feed_keys = new Set<string>()
  let notifications = false
  for (const part of parts) {
    for (const id of part.article_ids ?? []) article_ids.add(id)
    for (const id of part.conversation_ids ?? []) conversation_ids.add(id)
    if (part.feed_key) feed_keys.add(part.feed_key)
    if (part.notifications) notifications = true
  }
  const [feed_key] = [...feed_keys].sort()
  return {
    article_ids: [...article_ids].sort(),
    conversation_ids: [...conversation_ids].sort(),
    notifications,
    ...(feed_key ? { feed_key } : {}),
  }
}

/** Задержка переподключения: экспонента с потолком и «джиттером» от 50% до 100% значения. */
export function backoffDelay(attempt: number, random: () => number, max_ms = MAX_BACKOFF_MS): number {
  const ceiling = Math.min(max_ms, BASE_BACKOFF_MS * 2 ** attempt)
  return Math.round(ceiling * (0.5 + random() * 0.5))
}

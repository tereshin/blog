import { z } from 'zod'
import { env } from '@/shared/config'
import { http } from './http-client.ts'

export const FRAME_TYPES = ['article', 'comment', 'reaction', 'bookmark', 'view', 'notification', 'message', 'settings'] as const
export type FrameType = (typeof FRAME_TYPES)[number]

const frameSchema = z.union([
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

type MergedSubscription = { article_ids: string[]; feed_key?: string; conversation_ids: string[]; notifications: boolean }

export type EventSourceLike = {
  listen(on_message: (data: string) => void, on_error: () => void): void
  close(): void
}
type EventSourceFactory = (url: string) => EventSourceLike

export type EventStreamDeps = {
  url: string
  createSource: EventSourceFactory
  putSubscriptions: (body: MergedSubscription & { connection_id: string }) => Promise<unknown>
  random?: () => number
  /** Окно применения кадров батчем, мс (50–100). */
  flush_interval_ms?: number
  max_backoff_ms?: number
}

const DEFAULT_FLUSH_MS = 75
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

/**
 * Один поток событий на вкладку. Подписки владельцев (экранов) объединяются; запрос на сервер уходит,
 * только когда итоговый набор изменился. Кадры буферизуются и применяются батчем.
 */
export function createEventStream(deps: EventStreamDeps) {
  const random = deps.random ?? Math.random
  const flush_ms = deps.flush_interval_ms ?? DEFAULT_FLUSH_MS

  const subscriptions_by_owner = new Map<number, StreamSubscription>()
  const frame_handlers = new Set<(frames: LiveFrame[]) => void>()
  const reconnect_handlers = new Set<() => void>()

  let owner_counter = 0
  let source: EventSourceLike | null = null
  let connection_id: string | null = null
  let sent_key: string | null = null
  let has_connected_before = false
  let attempt = 0
  let buffer: LiveFrame[] = []
  let flush_timer: ReturnType<typeof setTimeout> | null = null
  let reconnect_timer: ReturnType<typeof setTimeout> | null = null
  let is_stopped = true

  const flush = (): void => {
    flush_timer = null
    if (buffer.length === 0) return
    const frames = buffer
    buffer = []
    for (const handler of [...frame_handlers]) handler(frames)
  }

  const syncSubscriptions = (): void => {
    if (!connection_id) return
    const merged = mergeSubscriptions(subscriptions_by_owner.values())
    const key = JSON.stringify(merged)
    if (key === sent_key) return
    sent_key = key
    void deps.putSubscriptions({ ...merged, connection_id }).catch(() => {
      // Не доставили — при следующем изменении или переподключении отправим заново.
      if (sent_key === key) sent_key = null
    })
  }

  const handleMessage = (raw: string): void => {
    let parsed: z.infer<typeof frameSchema>
    try {
      const result = frameSchema.safeParse(JSON.parse(raw))
      if (!result.success) return
      parsed = result.data
    } catch {
      return
    }
    if (parsed.type === 'hello') {
      connection_id = parsed.connection_id
      sent_key = null
      attempt = 0
      syncSubscriptions()
      if (has_connected_before) for (const handler of [...reconnect_handlers]) handler()
      has_connected_before = true
      return
    }
    buffer.push(parsed)
    flush_timer ??= setTimeout(flush, flush_ms)
  }

  const open = (): void => {
    if (is_stopped || source) return
    const next = deps.createSource(deps.url)
    source = next
    next.listen(handleMessage, () => {
      next.close()
      if (source === next) source = null
      connection_id = null
      if (is_stopped || reconnect_timer) return
      reconnect_timer = setTimeout(
        () => {
          reconnect_timer = null
          open()
        },
        backoffDelay(attempt, random, deps.max_backoff_ms),
      )
      attempt += 1
    })
  }

  const stop = (): void => {
    is_stopped = true
    source?.close()
    source = null
    connection_id = null
    sent_key = null
    has_connected_before = false
    attempt = 0
    if (reconnect_timer) clearTimeout(reconnect_timer)
    if (flush_timer) clearTimeout(flush_timer)
    reconnect_timer = null
    flush_timer = null
    buffer = []
  }

  return {
    /** Подписывает владельца; возвращает функцию отписки. Поток живёт, пока есть хотя бы один владелец. */
    attach(subscription: StreamSubscription): { update: (next: StreamSubscription) => void; detach: () => void } {
      owner_counter += 1
      const owner = owner_counter
      subscriptions_by_owner.set(owner, subscription)
      if (is_stopped) {
        is_stopped = false
        open()
      } else {
        syncSubscriptions()
      }
      return {
        update(next) {
          if (!subscriptions_by_owner.has(owner)) return
          subscriptions_by_owner.set(owner, next)
          syncSubscriptions()
        },
        detach() {
          if (!subscriptions_by_owner.delete(owner)) return
          if (subscriptions_by_owner.size === 0) stop()
          else syncSubscriptions()
        },
      }
    },
    onFrames(handler: (frames: LiveFrame[]) => void): () => void {
      frame_handlers.add(handler)
      return () => {
        frame_handlers.delete(handler)
      }
    },
    /** После восстановления потока клиент перечитывает открытые данные, не дожидаясь нового кадра. */
    onReconnected(handler: () => void): () => void {
      reconnect_handlers.add(handler)
      return () => {
        reconnect_handlers.delete(handler)
      }
    },
  }
}

export type EventStream = ReturnType<typeof createEventStream>

const subscriptionsResponseSchema = z.looseObject({})

export const eventStream: EventStream = createEventStream({
  url: `${env.api_base_url}/v1/events`,
  createSource: (url) => {
    const native = new EventSource(url, { withCredentials: true })
    return {
      listen(on_message, on_error) {
        native.onmessage = (event) => on_message(String(event.data))
        native.onerror = () => on_error()
      },
      close: () => native.close(),
    }
  },
  putSubscriptions: (body) => http.put('/v1/events/subscriptions', subscriptionsResponseSchema, { body }),
})

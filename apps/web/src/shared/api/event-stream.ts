import { z } from 'zod'
import { env } from '@/shared/config'
import { http } from './http-client.ts'
import { backoffDelay, frameSchema, mergeSubscriptions } from './event-subscriptions.ts'
import type { EventSourceFactory, EventSourceLike, LiveFrame, MergedSubscription, StreamSubscription } from './event-subscriptions.ts'

export { backoffDelay, FRAME_TYPES, mergeSubscriptions } from './event-subscriptions.ts'
export type { EventSourceLike, FrameType, LiveFrame, StreamSubscription } from './event-subscriptions.ts'

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
  let is_sync_scheduled = false

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
      scheduleSync()
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
    next.listen((raw) => {
      if (source === next) handleMessage(raw)
    }, () => {
      if (source !== next) return
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

  // Один commit React может снять и добавить несколько владельцев, в том числе
  // при проверке эффектов StrictMode. Отправляем только итоговый набор подписок.
  const scheduleSync = (): void => {
    if (is_sync_scheduled) return
    is_sync_scheduled = true
    void Promise.resolve().then(() => {
      is_sync_scheduled = false
      if (subscriptions_by_owner.size === 0) {
        stop()
        return
      }
      if (is_stopped) {
        is_stopped = false
        open()
      }
      syncSubscriptions()
    })
  }

  return {
    /** Подписывает владельца; возвращает функцию отписки. Поток живёт, пока есть хотя бы один владелец. */
    attach(subscription: StreamSubscription): { update: (next: StreamSubscription) => void; detach: () => void } {
      owner_counter += 1
      const owner = owner_counter
      subscriptions_by_owner.set(owner, subscription)
      scheduleSync()
      return {
        update(next) {
          if (!subscriptions_by_owner.has(owner)) return
          subscriptions_by_owner.set(owner, next)
          scheduleSync()
        },
        detach() {
          if (!subscriptions_by_owner.delete(owner)) return
          scheduleSync()
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

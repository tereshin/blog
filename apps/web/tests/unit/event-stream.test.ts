import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backoffDelay, createEventStream, mergeSubscriptions } from '@/shared/api/event-stream'
import type { EventSourceLike, LiveFrame } from '@/shared/api/event-stream'

class FakeSource implements EventSourceLike {
  on_message: (data: string) => void = () => {}
  on_error: () => void = () => {}
  is_closed = false
  listen(on_message: (data: string) => void, on_error: () => void) {
    this.on_message = on_message
    this.on_error = on_error
  }
  close() {
    this.is_closed = true
  }
  emit(frame: object) {
    this.on_message(JSON.stringify(frame))
  }
}

const CONNECTION = '11111111-1111-4111-8111-111111111111'

function setup() {
  const sources: FakeSource[] = []
  const puts: object[] = []
  const stream = createEventStream({
    url: '/v1/events',
    createSource: () => {
      const source = new FakeSource()
      sources.push(source)
      return source
    },
    putSubscriptions: (body) => {
      puts.push(body)
      return Promise.resolve({})
    },
    random: () => 1,
  })
  const last = () => {
    const source = sources.at(-1)
    if (!source) throw new Error('поток не открыт')
    return source
  }
  return { stream, sources, puts, last }
}

describe('event-stream', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('открывает поток при первой подписке и закрывает при последней отписке', async () => {
    const { stream, sources, last } = setup()
    const first = stream.attach({ notifications: true })
    const second = stream.attach({ article_ids: ['a'] })
    await Promise.resolve()
    expect(sources).toHaveLength(1)
    first.detach()
    await Promise.resolve()
    expect(last().is_closed).toBe(false)
    second.detach()
    await Promise.resolve()
    expect(last().is_closed).toBe(true)
  })

  it('отправляет подписки после hello и не дублирует неизменный набор', async () => {
    const { stream, puts, last } = setup()
    const owner = stream.attach({ article_ids: ['a'] })
    await Promise.resolve()
    expect(puts).toHaveLength(0)
    last().emit({ type: 'hello', connection_id: CONNECTION })
    await Promise.resolve()
    expect(puts).toEqual([{ article_ids: ['a'], conversation_ids: [], notifications: false, connection_id: CONNECTION }])

    owner.update({ article_ids: ['a'] })
    await Promise.resolve()
    expect(puts).toHaveLength(1)
    owner.update({ article_ids: ['a', 'b'] })
    await Promise.resolve()
    expect(puts).toHaveLength(2)
  })

  it('объединяет подписки нескольких экранов', () => {
    expect(mergeSubscriptions([{ article_ids: ['b'] }, { article_ids: ['a', 'b'], notifications: true }, { feed_key: 'fresh' }])).toEqual({
      article_ids: ['a', 'b'],
      conversation_ids: [],
      notifications: true,
      feed_key: 'fresh',
    })
  })

  it('применяет кадры батчем раз в окно, а не на каждый кадр', async () => {
    const { stream, last } = setup()
    const batches: LiveFrame[][] = []
    stream.onFrames((frames) => batches.push(frames))
    stream.attach({ notifications: true })
    await Promise.resolve()
    last().emit({ type: 'hello', connection_id: CONNECTION })
    for (const comment_id of ['1', '2', '3']) last().emit({ type: 'comment', comment_id, occurred_at: '2026-10-08T00:00:00Z' })
    expect(batches).toHaveLength(0)
    vi.advanceTimersByTime(75)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toHaveLength(3)
  })

  it('игнорирует мусорные кадры', async () => {
    const { stream, last } = setup()
    const handler = vi.fn()
    stream.onFrames(handler)
    stream.attach({})
    await Promise.resolve()
    last().on_message('не json')
    last().emit({ type: 'unknown', occurred_at: 'x' })
    vi.advanceTimersByTime(200)
    expect(handler).not.toHaveBeenCalled()
  })

  it('переподключается с backoff, заново подписывается и сообщает о восстановлении', async () => {
    const { stream, sources, puts, last } = setup()
    const reconnected = vi.fn()
    stream.onReconnected(reconnected)
    stream.attach({ notifications: true })
    await Promise.resolve()
    last().emit({ type: 'hello', connection_id: CONNECTION })
    await Promise.resolve()
    expect(reconnected).not.toHaveBeenCalled()

    last().on_error()
    expect(sources[0]?.is_closed).toBe(true)
    vi.advanceTimersByTime(999)
    expect(sources).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(sources).toHaveLength(2)

    last().emit({ type: 'hello', connection_id: '22222222-2222-4222-8222-222222222222' })
    await Promise.resolve()
    expect(reconnected).toHaveBeenCalledTimes(1)
    expect(puts).toHaveLength(2)
  })

  it('не открывает пробный поток при цикле mount-cleanup-mount в StrictMode', async () => {
    const { stream, sources, puts, last } = setup()
    stream.attach({ notifications: true }).detach()
    const owner = stream.attach({ notifications: true })
    await Promise.resolve()
    expect(sources).toHaveLength(1)
    last().emit({ type: 'hello', connection_id: CONNECTION })
    await Promise.resolve()
    expect(puts).toHaveLength(1)
    owner.detach()
    await Promise.resolve()
    expect(last().is_closed).toBe(true)
  })

  it('объединяет смену владельцев и обновления в один итоговый запрос', async () => {
    const { stream, sources, puts, last } = setup()
    const owner = stream.attach({ article_ids: ['a'], feed_key: 'fresh' })
    await Promise.resolve()
    last().emit({ type: 'hello', connection_id: CONNECTION })
    await Promise.resolve()
    owner.detach()
    const next = stream.attach({ article_ids: ['a'], feed_key: 'fresh' })
    await Promise.resolve()
    expect(sources).toHaveLength(1)
    expect(last().is_closed).toBe(false)
    expect(puts).toHaveLength(1)

    next.update({ article_ids: ['b'], feed_key: 'fresh' })
    next.update({ article_ids: ['b', 'c'], feed_key: 'fresh' })
    const notifications = stream.attach({ notifications: true })
    await Promise.resolve()
    expect(puts).toHaveLength(2)
    expect(puts[1]).toEqual({ article_ids: ['b', 'c'], conversation_ids: [], feed_key: 'fresh', notifications: true, connection_id: CONNECTION })
    next.detach()
    notifications.detach()
    await Promise.resolve()
    expect(puts).toHaveLength(2)
  })

  it('не открывает поток, если экран ушёл до отправки, и игнорирует закрытый источник', async () => {
    const { stream, sources, puts, last } = setup()
    stream.attach({}).detach()
    await Promise.resolve()
    expect(sources).toHaveLength(0)

    const owner = stream.attach({})
    await Promise.resolve()
    const closed = last()
    owner.detach()
    await Promise.resolve()
    closed.emit({ type: 'hello', connection_id: CONNECTION })
    closed.on_error()
    await Promise.resolve()
    vi.advanceTimersByTime(30_000)
    expect(sources).toHaveLength(1)
    expect(puts).toHaveLength(0)
  })

  it('задержка растёт экспоненциально, ограничена 30 с и имеет джиттер', () => {
    expect(backoffDelay(0, () => 1)).toBe(1000)
    expect(backoffDelay(3, () => 1)).toBe(8000)
    expect(backoffDelay(10, () => 1)).toBe(30_000)
    expect(backoffDelay(10, () => 0)).toBe(15_000)
  })
})

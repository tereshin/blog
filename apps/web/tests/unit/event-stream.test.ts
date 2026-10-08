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

  it('открывает поток при первой подписке и закрывает при последней отписке', () => {
    const { stream, sources, last } = setup()
    const first = stream.attach({ notifications: true })
    const second = stream.attach({ article_ids: ['a'] })
    expect(sources).toHaveLength(1)
    first.detach()
    expect(last().is_closed).toBe(false)
    second.detach()
    expect(last().is_closed).toBe(true)
  })

  it('отправляет подписки после hello и не дублирует неизменный набор', async () => {
    const { stream, puts, last } = setup()
    const owner = stream.attach({ article_ids: ['a'] })
    expect(puts).toHaveLength(0)
    last().emit({ type: 'hello', connection_id: CONNECTION })
    expect(puts).toEqual([{ article_ids: ['a'], conversation_ids: [], notifications: false, connection_id: CONNECTION }])

    owner.update({ article_ids: ['a'] })
    expect(puts).toHaveLength(1)
    owner.update({ article_ids: ['a', 'b'] })
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

  it('применяет кадры батчем раз в окно, а не на каждый кадр', () => {
    const { stream, last } = setup()
    const batches: LiveFrame[][] = []
    stream.onFrames((frames) => batches.push(frames))
    stream.attach({ notifications: true })
    last().emit({ type: 'hello', connection_id: CONNECTION })
    for (const comment_id of ['1', '2', '3']) last().emit({ type: 'comment', comment_id, occurred_at: '2026-10-08T00:00:00Z' })
    expect(batches).toHaveLength(0)
    vi.advanceTimersByTime(75)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toHaveLength(3)
  })

  it('игнорирует мусорные кадры', () => {
    const { stream, last } = setup()
    const handler = vi.fn()
    stream.onFrames(handler)
    stream.attach({})
    last().on_message('не json')
    last().emit({ type: 'unknown', occurred_at: 'x' })
    vi.advanceTimersByTime(200)
    expect(handler).not.toHaveBeenCalled()
  })

  it('переподключается с backoff, заново подписывается и сообщает о восстановлении', () => {
    const { stream, sources, puts, last } = setup()
    const reconnected = vi.fn()
    stream.onReconnected(reconnected)
    stream.attach({ notifications: true })
    last().emit({ type: 'hello', connection_id: CONNECTION })
    expect(reconnected).not.toHaveBeenCalled()

    last().on_error()
    expect(sources[0]?.is_closed).toBe(true)
    vi.advanceTimersByTime(999)
    expect(sources).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(sources).toHaveLength(2)

    last().emit({ type: 'hello', connection_id: '22222222-2222-4222-8222-222222222222' })
    expect(reconnected).toHaveBeenCalledTimes(1)
    expect(puts).toHaveLength(2)
  })

  it('задержка растёт экспоненциально, ограничена 30 с и имеет джиттер', () => {
    expect(backoffDelay(0, () => 1)).toBe(1000)
    expect(backoffDelay(3, () => 1)).toBe(8000)
    expect(backoffDelay(10, () => 1)).toBe(30_000)
    expect(backoffDelay(10, () => 0)).toBe(15_000)
  })
})

// Замена EventSource для режима фикстурного gateway: MSW не умеет держать SSE-поток.
// Первым кадром приходит `hello` с connection_id, дальше кадры подаёт тест или разработчик через `mockEvents`.

type Listener = (event: { data: string }) => void

const open_sources = new Set<FakeEventSource>()

export class FakeEventSource {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2

  readonly url: string
  readonly withCredentials: boolean
  readyState = FakeEventSource.CONNECTING
  onmessage: Listener | null = null
  onerror: (() => void) | null = null
  onopen: (() => void) | null = null

  constructor(url: string, init?: { withCredentials?: boolean }) {
    this.url = url
    this.withCredentials = init?.withCredentials ?? false
    open_sources.add(this)
    setTimeout(() => {
      if (this.readyState === FakeEventSource.CLOSED) return
      this.readyState = FakeEventSource.OPEN
      this.onopen?.()
      this.dispatch({ type: 'hello', connection_id: crypto.randomUUID() })
    }, 0)
  }

  dispatch(frame: object): void {
    this.onmessage?.({ data: JSON.stringify(frame) })
  }

  close(): void {
    this.readyState = FakeEventSource.CLOSED
    open_sources.delete(this)
  }
}

const live_channel = new BroadcastChannel('blog-mock-live')

export const mockEvents = {
  /** Рассылает кадр всем открытым потокам этой вкладки и другим вкладкам того же браузера. */
  emit(frame: { type: string; occurred_at?: string; [key: string]: unknown }): void {
    const complete = { occurred_at: new Date().toISOString(), ...frame }
    for (const source of [...open_sources]) source.dispatch(complete)
    live_channel.postMessage(complete)
  },
  /** Имитирует обрыв: клиент переподключится с backoff. */
  drop(): void {
    for (const source of [...open_sources]) source.onerror?.()
  },
}

live_channel.addEventListener('message', (event: MessageEvent<object>) => {
  for (const source of [...open_sources]) source.dispatch(event.data)
})

export function installFakeEventSource(): void {
  Object.defineProperty(window, 'EventSource', { value: FakeEventSource, configurable: true, writable: true })
  Object.defineProperty(window, 'mockEvents', { value: mockEvents, configurable: true })
}

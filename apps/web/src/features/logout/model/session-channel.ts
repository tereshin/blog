let channel: BroadcastChannel | null = null

/** Один канал на вкладку. Сообщение уходит в остальные вкладки и не возвращается отправителю. */
export function sessionChannel(): BroadcastChannel | null {
  if (channel) return channel
  if (typeof BroadcastChannel === 'undefined') return null
  channel = new BroadcastChannel('session')
  return channel
}

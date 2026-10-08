import { useEffect, useRef } from 'react'
import { eventStream } from './event-stream.ts'
import type { FrameType, LiveFrame, StreamSubscription } from './event-stream.ts'

type SignalHandlers = Partial<Record<FrameType, (frames: LiveFrame[]) => void>>

export type UseLiveSignalsOptions = {
  subscribe: StreamSubscription
  on: SignalHandlers
  /** Поток восстановился: перечитать открытые статью, ленту, колокольчик, диалог. */
  onReconnected?: () => void
}

/**
 * Подписывает экран на сигналы и автоматически отписывает при размонтировании.
 * Обработчики получают только кадры своего типа, уже собранные батчем.
 */
export function useLiveSignals({ subscribe, on, onReconnected }: UseLiveSignalsOptions): void {
  const handlers_ref = useRef({ on, onReconnected })
  useEffect(() => {
    handlers_ref.current = { on, onReconnected }
  })

  const subscription_key = JSON.stringify(subscribe)

  useEffect(() => {
    // Подписка воссоздаётся только при смене набора (ключ), а не при каждом рендере.
    const subscription: StreamSubscription = JSON.parse(subscription_key)
    const attachment = eventStream.attach(subscription)
    const stop_frames = eventStream.onFrames((frames) => {
      for (const type of Object.keys(handlers_ref.current.on) as FrameType[]) {
        const handler = handlers_ref.current.on[type]
        const matched = frames.filter((frame) => frame.type === type)
        if (handler && matched.length > 0) handler(matched)
      }
    })
    const stop_reconnect = eventStream.onReconnected(() => handlers_ref.current.onReconnected?.())
    return () => {
      stop_frames()
      stop_reconnect()
      attachment.detach()
    }
  }, [subscription_key])
}

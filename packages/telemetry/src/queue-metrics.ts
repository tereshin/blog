import type { ServiceMetrics } from './metrics.ts'

export type QueueSample = {
  lag: readonly { durable: string; pending: number }[]
  dlq: readonly { stream: string; messages: number }[]
}

/** Периодически записывает лаг потребителей и глубину DLQ. Ошибки опроса не роняют процесс. */
export function startQueueMetrics(
  metrics: ServiceMetrics,
  sample: () => Promise<QueueSample>,
  interval_ms = 15_000,
): { stop: () => Promise<void> } {
  const tick = (): void => {
    void sample()
      .then((snapshot) => {
        for (const item of snapshot.lag) metrics.consumer_lag.labels({ durable: item.durable }).set(item.pending)
        for (const item of snapshot.dlq) metrics.dlq_depth.labels({ stream: item.stream }).set(item.messages)
      })
      .catch(() => {
        // Брокер ещё не готов — следующий опрос.
      })
  }
  tick()
  const timer = setInterval(tick, interval_ms)
  timer.unref()
  return {
    stop: () => {
      clearInterval(timer)
      return Promise.resolve()
    },
  }
}

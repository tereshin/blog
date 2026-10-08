import closeWithGrace from 'close-with-grace'
import type { FastifyInstance } from 'fastify'
import type { Logger } from '@blog/logger'

export type ShutdownOptions = {
  app: FastifyInstance
  logger: Logger
  /** Остановка консьюмеров, outbox-релея, пула БД и брокера — в порядке зависимости. */
  stoppers?: (() => Promise<void>)[]
  /** Максимальное ожидание активных запросов, мс. */
  grace_ms?: number
}

/** Graceful shutdown: readiness → false, дождаться запросов ≤ 10 с, остановить консьюмеры, закрыть пул. */
export function registerShutdown(options: ShutdownOptions): void {
  closeWithGrace({ delay: options.grace_ms ?? 10_000, logger: options.logger }, async ({ signal, err }) => {
    if (err) options.logger.error({ err }, 'аварийная остановка')
    else options.logger.info({ signal }, 'получен сигнал остановки')
    options.app.readiness.is_accepting = false
    await options.app.close()
    for (const stop of options.stoppers ?? []) await stop()
  })
}

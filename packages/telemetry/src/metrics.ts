import { monitorEventLoopDelay } from 'node:perf_hooks'
import { Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client'

const DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]

export type ServiceMetrics = {
  registry: Registry
  http_duration: Histogram<'method' | 'route' | 'status'>
  consumer_duration: Histogram<'subject' | 'outcome'>
  event_loop_lag_p99: Gauge
  /** Останавливает измерение лага event loop (при остановке сервиса). */
  stop: () => void
}

/** Имя метрики по правилу: `<service>_<subsystem>_<name>_<unit>`; дефисы сервиса — в подчёркивания. */
export function metricPrefix(service: string): string {
  return service.replaceAll('-', '_')
}

/** RED-метрики на HTTP и потребителей событий плюс лаг event loop (p99 > 50 мс — баг). */
export function createServiceMetrics(service: string): ServiceMetrics {
  const registry = new Registry()
  const prefix = metricPrefix(service)
  registry.setDefaultLabels({ service })
  collectDefaultMetrics({ register: registry })

  const http_duration = new Histogram({
    name: `${prefix}_http_request_duration_seconds`,
    help: 'Длительность HTTP-запроса',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: DURATION_BUCKETS,
    registers: [registry],
  })

  const consumer_duration = new Histogram({
    name: `${prefix}_consumer_duration_seconds`,
    help: 'Длительность обработки события потребителем',
    labelNames: ['subject', 'outcome'] as const,
    buckets: DURATION_BUCKETS,
    registers: [registry],
  })

  const loop_delay = monitorEventLoopDelay({ resolution: 20 })
  loop_delay.enable()
  const event_loop_lag_p99 = new Gauge({
    name: `${prefix}_event_loop_lag_p99_seconds`,
    help: 'Лаг event loop, 99-й перцентиль',
    registers: [registry],
    collect() {
      this.set(loop_delay.percentile(99) / 1e9)
      loop_delay.reset()
    },
  })

  return {
    registry,
    http_duration,
    consumer_duration,
    event_loop_lag_p99,
    stop: () => loop_delay.disable(),
  }
}

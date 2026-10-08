import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

export type StartTelemetryOptions = {
  service: string
  /** Адрес OTLP-приёмника. Пусто — трассы собираются, но никуда не экспортируются (FR-126). */
  otlp_endpoint?: string | undefined
}

export type TelemetryHandle = { shutdown: () => Promise<void> }

/**
 * Запускает OpenTelemetry с автоинструментацией http, undici и pg. Коллектора в `infra/` нет:
 * экспорт включается переменной, когда внешний сборщик появится. Вызывается первой строкой `main.ts`.
 * Контекст в NATS пробрасывается заголовками сообщения в `@blog/broker`.
 */
export function startTelemetry(options: StartTelemetryOptions): TelemetryHandle {
  const sdk = new NodeSDK({
    serviceName: options.service,
    ...(options.otlp_endpoint
      ? { traceExporter: new OTLPTraceExporter({ url: `${options.otlp_endpoint}/v1/traces` }) }
      : {}),
    instrumentations: [new HttpInstrumentation(), new UndiciInstrumentation(), new PgInstrumentation()],
  })
  sdk.start()
  return { shutdown: () => sdk.shutdown() }
}

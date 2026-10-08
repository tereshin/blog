import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import type { ServiceMetrics } from '@blog/telemetry'

export type ReadinessCheck = {
  name: string
  check: () => Promise<boolean>
}

export type HealthOptions = {
  checks: ReadinessCheck[]
  metrics: ServiceMetrics
}

/** Состояние готовности: после SIGTERM сервис перестаёт быть ready, но остаётся live. */
export type Readiness = { is_accepting: boolean }

declare module 'fastify' {
  interface FastifyInstance {
    readiness: Readiness
  }
}

const healthPlugin: FastifyPluginAsync<HealthOptions> = async (app, options) => {
  app.decorate('readiness', { is_accepting: true } satisfies Readiness)

  app.get('/health/live', { config: { is_public: true } }, async () => ({ status: 'ok' }))

  app.get('/health/ready', { config: { is_public: true } }, async (_request, reply) => {
    const results = await Promise.all(
      options.checks.map(async ({ name, check }) => {
        try {
          return [name, await check()] as const
        } catch {
          return [name, false] as const
        }
      }),
    )
    const checks = Object.fromEntries(results)
    const is_ready = app.readiness.is_accepting && results.every(([, ok]) => ok)
    return reply.code(is_ready ? 200 : 503).send({ status: is_ready ? 'ready' : 'not_ready', checks })
  })

  app.get('/metrics', { config: { is_public: true } }, async (_request, reply) => {
    return reply.type(options.metrics.registry.contentType).send(await options.metrics.registry.metrics())
  })

  app.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions.url ?? 'unmatched'
    if (route.startsWith('/health') || route === '/metrics') return
    options.metrics.http_duration
      .labels({ method: request.method, route, status: String(reply.statusCode) })
      .observe(reply.elapsedTime / 1000)
  })
}

export const health = fp(healthPlugin, { name: 'blog-health' })

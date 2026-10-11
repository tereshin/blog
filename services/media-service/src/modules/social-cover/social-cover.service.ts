import { SOCIAL_COVER_SIZES } from '@blog/contracts'
import type { SocialImages } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import type { ServiceMetrics } from '@blog/telemetry'
import type { ObjectStore } from '../media/index.ts'
import type { CoverRenderer } from './social-cover.types.ts'
import type { CoverJobsRepository } from './social-cover.repository.ts'
import { coverAssets } from './social-cover.assets.ts'

export function createCoverWorker(deps: { repository: CoverJobsRepository; renderer: CoverRenderer; store: ObjectStore; public_url: string; logger: Logger; metrics: ServiceMetrics }) {
  let is_stopped = true
  let is_running = false
  let timer: NodeJS.Timeout | undefined
  async function runOnce(): Promise<boolean> {
    const job = await deps.repository.claim()
    if (!job) return false
    const started = performance.now()
    try {
      const assets = await coverAssets(job.event.input, deps.store, deps.public_url)
      const results = await Promise.all((['og', 'twitter', 'vk'] as const).map(async (variant) => {
        const result = await deps.renderer.render({ input: job.event.input, variant, ...assets })
        for (const warning of result.warnings) deps.logger.warn({ warning, target_id: job.event.target_id, correlation_id: job.event.correlation_id }, 'social cover: using fallback')
        const key = `social-covers/${job.event.target_id}/${job.event.revision}/${variant}.jpg`
        await deps.store.put({ key, body: result.bytes, content_type: 'image/jpeg' })
        return { variant, image: { url: `${deps.public_url.replace(/\/$/, '')}/${key}`, ...SOCIAL_COVER_SIZES[variant], alt: job.event.input.title, mime: 'image/jpeg' } }
      }))
      const og = results.find((result) => result.variant === 'og')?.image
      const twitter = results.find((result) => result.variant === 'twitter')?.image
      const vk = results.find((result) => result.variant === 'vk')?.image
      if (!og || !twitter || !vk) throw new Error('Incomplete social cover set')
      const images: SocialImages = { og, twitter, vk }
      await deps.repository.complete(job, images)
      deps.metrics.consumer_duration.labels({ subject: 'social-cover-render', outcome: 'ok' }).observe((performance.now() - started) / 1000)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await deps.repository.fail(job, message)
      deps.metrics.consumer_duration.labels({ subject: 'social-cover-render', outcome: 'error' }).observe((performance.now() - started) / 1000)
      deps.logger.error({ err: error, target_id: job.event.target_id, attempts: job.attempts, correlation_id: job.event.correlation_id }, 'social cover: generation failed')
    }
    return true
  }
  const schedule = () => { if (!is_stopped) timer = setTimeout(() => void tick(), 500) }
  async function tick() {
    is_running = true
    try {
      while (!is_stopped && await runOnce()) { /* Drain persistent jobs, rendering outside database transactions. */ }
      const counts = await deps.repository.counts()
      deps.metrics.consumer_lag.labels({ durable: 'media-social-cover-jobs' }).set(counts.pending)
      deps.metrics.dlq_depth.labels({ stream: 'media-social-cover-jobs' }).set(counts.failed)
    } catch (error) {
      deps.logger.error({ err: error }, 'social cover: worker poll failed')
    } finally { is_running = false; schedule() }
  }
  return {
    runOnce,
    start() { if (!is_stopped) return; is_stopped = false; schedule() },
    async stop() { is_stopped = true; if (timer) clearTimeout(timer); while (is_running) await new Promise((resolve) => setTimeout(resolve, 10)) },
  }
}

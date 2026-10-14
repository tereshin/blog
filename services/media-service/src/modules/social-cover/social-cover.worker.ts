import type { Database } from '@blog/broker'
import type { Logger } from '@blog/logger'
import type { ServiceMetrics } from '@blog/telemetry'
import type { SocialCoverService } from './social-cover.service.ts'
import type { CoverJobsRepositoryPort } from './social-cover.types.ts'

const POLL_INTERVAL_MS = 500
const STOP_POLL_MS = 10

export type SocialCoverWorkerOptions = { logger: Logger; metrics: ServiceMetrics }

/** Фоновый цикл задач обложек: рендер идёт вне транзакций БД, задачи хранятся в PostgreSQL. */
export class SocialCoverWorker {
  private is_stopped = true
  private is_running = false
  private timer: NodeJS.Timeout | undefined

  constructor(
    private readonly repository: CoverJobsRepositoryPort<Database>,
    private readonly service: SocialCoverService,
    private readonly options: SocialCoverWorkerOptions,
  ) {}

  /** `false` — очередь пуста. */
  async runOnce(): Promise<boolean> {
    const { logger, metrics } = this.options
    const job = await this.repository.claim()
    if (!job) return false
    const started = performance.now()
    try {
      const images = await this.service.renderSet(job.event)
      await this.repository.complete(job, images)
      metrics.consumer_duration.labels({ subject: 'social-cover-render', outcome: 'ok' }).observe((performance.now() - started) / 1000)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.repository.fail(job, message)
      metrics.consumer_duration.labels({ subject: 'social-cover-render', outcome: 'error' }).observe((performance.now() - started) / 1000)
      logger.error({ err: error, target_id: job.event.target_id, attempts: job.attempts, correlation_id: job.event.correlation_id }, 'social cover: generation failed')
    }
    return true
  }

  start(): void {
    if (!this.is_stopped) return
    this.is_stopped = false
    this.schedule()
  }

  async stop(): Promise<void> {
    this.is_stopped = true
    if (this.timer) clearTimeout(this.timer)
    while (this.is_running) await new Promise((resolve) => setTimeout(resolve, STOP_POLL_MS))
  }

  private schedule(): void {
    if (!this.is_stopped) this.timer = setTimeout(() => void this.tick(), POLL_INTERVAL_MS)
  }

  private async tick(): Promise<void> {
    const { logger, metrics } = this.options
    this.is_running = true
    try {
      while (!this.is_stopped && (await this.runOnce())) {
        /* Drain persistent jobs, rendering outside database transactions. */
      }
      const counts = await this.repository.counts()
      metrics.consumer_lag.labels({ durable: 'media-social-cover-jobs' }).set(counts.pending)
      metrics.dlq_depth.labels({ stream: 'media-social-cover-jobs' }).set(counts.failed)
    } catch (error) {
      logger.error({ err: error }, 'social cover: worker poll failed')
    } finally {
      this.is_running = false
      this.schedule()
    }
  }
}

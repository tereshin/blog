import { Worker } from 'node:worker_threads'
import { existsSync } from 'node:fs'
import { ServiceUnavailableError } from '@blog/http-kit'
import { RenderMessageSchema } from './social-cover.schema.ts'
import type { CoverRenderer, RenderResult, RenderTask } from './social-cover.types.ts'

const RENDER_TIMEOUT_MS = 30_000
const MAX_QUEUE_LENGTH = 32

type Job = { id: number; task: RenderTask; resolve: (result: RenderResult) => void; reject: (error: Error) => void }
type Slot = { worker: Worker; job: Job | null; timer: NodeJS.Timeout | null }

/** Пул потоков рендера: упавший поток заменяется новым, переполненная очередь отвечает 503. */
export class SocialCoverPool implements CoverRenderer {
  private readonly worker_url: URL
  private readonly queue: Job[] = []
  private readonly slots: Slot[] = []
  private sequence = 0
  private is_closed = false

  constructor(size = 2) {
    const bundled = new URL('./renderer.worker.js', import.meta.url)
    this.worker_url = existsSync(bundled) ? bundled : new URL('./renderer.worker.ts', import.meta.url)
    for (let index = 0; index < size; index++) this.slots.push(this.spawn())
  }

  render(task: RenderTask): Promise<RenderResult> {
    if (this.is_closed || this.queue.length >= MAX_QUEUE_LENGTH) return Promise.reject(new ServiceUnavailableError('social-cover-renderer'))
    return new Promise<RenderResult>((resolve, reject) => {
      this.queue.push({ id: ++this.sequence, task, resolve, reject })
      this.dispatch()
    })
  }

  async close(): Promise<void> {
    this.is_closed = true
    for (const job of this.queue.splice(0)) job.reject(new Error('Social cover renderer closed'))
    for (const slot of this.slots) {
      if (slot.timer) clearTimeout(slot.timer)
      slot.job?.reject(new Error('Social cover renderer closed'))
      slot.job = null
    }
    await Promise.all(this.slots.map((slot) => slot.worker.terminate()))
  }

  private dispatch(): void {
    for (const slot of this.slots) {
      if (slot.job || this.queue.length === 0 || this.is_closed) continue
      const job = this.queue.shift()
      if (!job) continue
      slot.job = job
      slot.timer = setTimeout(() => {
        job.reject(new Error('Social cover render timed out'))
        slot.job = null
        void slot.worker.terminate()
      }, RENDER_TIMEOUT_MS)
      slot.worker.postMessage({ id: job.id, task: job.task })
    }
  }

  private spawn(): Slot {
    const slot: Slot = { worker: new Worker(this.worker_url), job: null, timer: null }
    slot.worker.on('message', (message: unknown) => {
      const result = RenderMessageSchema.safeParse(message)
      if (!result.success || !slot.job || result.data.id !== slot.job.id) return
      if (slot.timer) clearTimeout(slot.timer)
      const job = slot.job
      slot.job = null
      if (result.data.ok) job.resolve({ bytes: result.data.bytes, warnings: result.data.warnings })
      else job.reject(new Error(result.data.error))
      this.dispatch()
    })
    slot.worker.on('error', (error) => {
      slot.job?.reject(error instanceof Error ? error : new Error(String(error)))
      slot.job = null
    })
    slot.worker.on('exit', () => {
      if (slot.timer) clearTimeout(slot.timer)
      slot.job?.reject(new Error('Social cover worker exited'))
      const index = this.slots.indexOf(slot)
      if (!this.is_closed && index >= 0) {
        this.slots[index] = this.spawn()
        this.dispatch()
      }
    })
    return slot
  }
}

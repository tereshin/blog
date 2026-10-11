import { Worker } from 'node:worker_threads'
import { existsSync } from 'node:fs'
import { ServiceUnavailableError } from '@blog/http-kit'
import { renderMessageSchema } from './social-cover.types.ts'
import type { CoverRenderer, RenderResult, RenderTask } from './social-cover.types.ts'

type Job = { id: number; task: RenderTask; resolve: (result: RenderResult) => void; reject: (error: Error) => void }
type Slot = { worker: Worker; job: Job | null; timer: NodeJS.Timeout | null }

export function createCoverRenderer(size = 2): CoverRenderer {
  const bundled = new URL('./renderer.worker.js', import.meta.url)
  const worker_url = existsSync(bundled) ? bundled : new URL('./renderer.worker.ts', import.meta.url)
  const queue: Job[] = []
  const slots: Slot[] = []
  let sequence = 0
  let is_closed = false
  function dispatch() {
    for (const slot of slots) {
      if (slot.job || queue.length === 0 || is_closed) continue
      const job = queue.shift()
      if (!job) continue
      slot.job = job
      slot.timer = setTimeout(() => {
        job.reject(new Error('Social cover render timed out'))
        slot.job = null
        void slot.worker.terminate()
      }, 30_000)
      slot.worker.postMessage({ id: job.id, task: job.task })
    }
  }
  function spawn(): Slot {
    const slot: Slot = { worker: new Worker(worker_url), job: null, timer: null }
    slot.worker.on('message', (message: unknown) => {
      const result = renderMessageSchema.safeParse(message)
      if (!result.success || !slot.job || result.data.id !== slot.job.id) return
      if (slot.timer) clearTimeout(slot.timer)
      const job = slot.job
      slot.job = null
      if (result.data.ok) job.resolve({ bytes: result.data.bytes, warnings: result.data.warnings })
      else job.reject(new Error(result.data.error))
      dispatch()
    })
    slot.worker.on('error', (error) => {
      slot.job?.reject(error instanceof Error ? error : new Error(String(error)))
      slot.job = null
    })
    slot.worker.on('exit', () => {
      if (slot.timer) clearTimeout(slot.timer)
      slot.job?.reject(new Error('Social cover worker exited'))
      const index = slots.indexOf(slot)
      if (!is_closed && index >= 0) { slots[index] = spawn(); dispatch() }
    })
    return slot
  }
  for (let index = 0; index < size; index++) slots.push(spawn())
  return {
    render(task) {
      if (is_closed || queue.length >= 32) return Promise.reject(new ServiceUnavailableError('social-cover-renderer'))
      return new Promise<RenderResult>((resolve, reject) => { queue.push({ id: ++sequence, task, resolve, reject }); dispatch() })
    },
    async close() {
      is_closed = true
      for (const job of queue.splice(0)) job.reject(new Error('Social cover renderer closed'))
      for (const slot of slots) { if (slot.timer) clearTimeout(slot.timer); slot.job?.reject(new Error('Social cover renderer closed')); slot.job = null }
      await Promise.all(slots.map((slot) => slot.worker.terminate()))
    },
  }
}

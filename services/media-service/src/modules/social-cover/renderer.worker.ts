import { parentPort } from 'node:worker_threads'
import { z } from 'zod'
import { renderTaskSchema } from './social-cover.types.ts'
import { renderSocialCover } from './social-cover.renderer.ts'

const messageSchema = z.object({ id: z.number(), task: renderTaskSchema })
if (!parentPort) throw new Error('Social cover renderer must run in a worker')
const port = parentPort
port.on('message', (message: unknown) => {
  void (async () => {
    const { id, task } = messageSchema.parse(message)
    try {
      const result = await renderSocialCover(task)
      port.postMessage({ id, ok: true, ...result })
    } catch (error) {
      port.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  })()
})

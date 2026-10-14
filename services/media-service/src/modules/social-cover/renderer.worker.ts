import { parentPort } from 'node:worker_threads'
import { RenderRequestSchema } from './social-cover.schema.ts'
import { renderSocialCover } from './social-cover.renderer.ts'

if (!parentPort) throw new Error('Social cover renderer must run in a worker')
const port = parentPort
port.on('message', (message: unknown) => {
  void (async () => {
    const { id, task } = RenderRequestSchema.parse(message)
    try {
      const result = await renderSocialCover(task)
      port.postMessage({ id, ok: true, ...result })
    } catch (error) {
      port.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  })()
})

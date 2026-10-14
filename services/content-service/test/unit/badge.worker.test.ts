import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import { startBadgeWorker } from '../../src/infra/workers/badge-worker.ts'

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })
describe('badge worker lifecycle', () => {
  it('runs immediately, logs failure, retries on schedule and stops without more work', async () => {
    vi.useFakeTimers()
    const database = openDatabase('postgres://unused:unused@localhost/unused')
    const connect = vi.spyOn(database.pool, 'connect').mockRejectedValue(new Error('offline'))
    const logger = createLogger({ service: 'badge-test', level: 'silent' })
    const error = vi.spyOn(logger, 'error')
    const worker = startBadgeWorker(database, logger)
    try {
      await vi.advanceTimersByTimeAsync(0)
      expect(connect).toHaveBeenCalledTimes(1)
      expect(error).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
      expect(connect).toHaveBeenCalledTimes(2)
      expect(error).toHaveBeenCalledTimes(2)
      await worker.stop()
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
      expect(connect).toHaveBeenCalledTimes(2)
    } finally { await worker.stop(); await database.close() }
  })
})

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../../../..')
const SERVICES = ['identity-service', 'content-service', 'discussion-service', 'messaging-service', 'notification-service', 'media-service']

describe('seed в prod', () => {
  it.each(SERVICES)('%s завершается до записи', (service) => {
    const env: NodeJS.ProcessEnv = { ...process.env, APP_ENV: 'prod' }
    delete env['DATABASE_URL']
    const result = spawnSync('pnpm', ['exec', 'tsx', 'src/seed.ts'], {
      cwd: resolve(ROOT, 'services', service),
      encoding: 'utf8',
      env,
    })
    expect(result.status).not.toBe(0)
    expect(`${result.stderr}${result.stdout}`).toMatch(/prod/i)
  })
})

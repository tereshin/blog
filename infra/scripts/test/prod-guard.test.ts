import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../../..')

describe('запрет prod с заглушками', () => {
  const dir = mkdtempSync(join(tmpdir(), 'blog-prod-guard-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('называет первую заглушку и не вызывает docker', () => {
    const env_file = join(dir, 'prod.env')
    const marker = join(dir, 'docker-called')
    const bin = join(dir, 'bin')
    writeFileSync(env_file, readFileSync(join(ROOT, 'infra/env/prod.env.example'), 'utf8'))
    mkdirSync(bin)
    writeFileSync(join(bin, 'docker'), `#!/bin/sh\necho called > '${marker}'\nexit 99\n`)
    chmodSync(join(bin, 'docker'), 0o755)
    const result = spawnSync('pnpm', ['exec', 'tsx', 'infra/scripts/up.ts', 'prod'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env['PATH'] ?? ''}`, INFRA_ENV_FILE: env_file },
    })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('IDENTITY_DB_PASSWORD')
    expect(existsSync(marker)).toBe(false)
  })
})

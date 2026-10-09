import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../../..')

describe('раскладка репозитория', () => {
  it('compose и Dockerfile лежат в infra, не в корне и не в docker/', () => {
    expect(existsSync(resolve(ROOT, 'docker-compose.yml'))).toBe(false)
    expect(existsSync(resolve(ROOT, 'Dockerfile'))).toBe(false)
    expect(existsSync(resolve(ROOT, 'docker'))).toBe(false)
    expect(existsSync(resolve(ROOT, 'infra/compose/docker-compose.yml'))).toBe(true)
  })

  it('gitignore закрывает infra/env/*.env, в git только шаблоны', () => {
    const gitignore = readFileSync(resolve(ROOT, '.gitignore'), 'utf8')
    expect(gitignore).toContain('infra/env/*.env')
    const tracked = execFileSync('git', ['ls-files', 'infra/env'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    expect(tracked.length).toBeGreaterThan(0)
    expect(tracked.every((name) => name.endsWith('.example'))).toBe(true)
  })
})

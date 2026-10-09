import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../../..')

describe('опубликованные порты prod', () => {
  const dir = mkdtempSync(join(tmpdir(), 'blog-ports-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('наружу смотрят только клиент и gateway', () => {
    const text = readFileSync(join(ROOT, 'infra/env/prod.env.example'), 'utf8').replaceAll('CHANGE_ME', 'placeholder')
    const env_file = join(dir, 'prod.env')
    writeFileSync(env_file, text)
    const rendered = execFileSync(
      'docker',
      ['compose', '-f', 'infra/compose/docker-compose.yml', '-f', 'infra/compose/docker-compose.prod.yml', '--env-file', env_file, 'config'],
      { cwd: ROOT, encoding: 'utf8' },
    )
    expect(rendered).not.toContain('nginx-proxy')
    expect(rendered).not.toContain('prometheus')
    expect(rendered).not.toContain('grafana')
    expect(rendered).not.toContain('redis')
    const published = [...rendered.matchAll(/published:\s*"(\d+)"/g)].map((match) => match[1])
    expect(published.sort()).toEqual(['3000', '8080'])
  })

  it('постоянных контейнеров prod шестнадцать', () => {
    const services = execFileSync(
      'docker',
      [
        'compose',
        '-f',
        'infra/compose/docker-compose.yml',
        '-f',
        'infra/compose/docker-compose.prod.yml',
        '--env-file',
        join(dir, 'prod.env'),
        'config',
        '--services',
      ],
      { cwd: ROOT, encoding: 'utf8' },
    )
      .split(/\s+/)
      .filter(Boolean)
    const oneshot = services.filter((name) => name.endsWith('-migrate') || name === 'minio-init')
    expect(services.length - oneshot.length).toBe(16)
  })
})

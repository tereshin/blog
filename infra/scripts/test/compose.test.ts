import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  UsageError,
  buildComposeArgs,
  expandServices,
  findPlaceholder,
  hasMockGoogle,
  parseArgs,
} from '../lib/compose.ts'

const ROOT = resolve(import.meta.dirname, '../../..')

describe('buildComposeArgs', () => {
  it('собирает базу, файл окружения и env-файл', () => {
    expect(buildComposeArgs('dev')).toEqual([
      '-f',
      'infra/compose/docker-compose.yml',
      '-f',
      'infra/compose/docker-compose.dev.yml',
      '--env-file',
      'infra/env/dev.env',
    ])
  })
})

describe('findPlaceholder', () => {
  it('возвращает имя первой переменной с заглушкой и пропускает комментарии', () => {
    const text = ['# GOOGLE_CLIENT_SECRET=CHANGE_ME', 'APP_ENV=prod', 'A_KEY=real', 'B_KEY=CHANGE_ME', 'C_KEY=CHANGE_ME'].join('\n')
    expect(findPlaceholder(text)).toBe('B_KEY')
  })

  it('без заглушек — null', () => {
    expect(findPlaceholder('APP_ENV=prod\nKEY=value')).toBeNull()
  })
})

describe('expandServices', () => {
  it('добавляет базы, миграции, NATS и MinIO', () => {
    const result = expandServices(['gateway', 'identity', 'media'])
    expect(result).toEqual(
      expect.arrayContaining(['gateway', 'identity', 'identity-db', 'identity-migrate', 'media', 'media-db', 'media-migrate', 'minio-init', 'nats', 'minio']),
    )
    expect(result).not.toContain('gateway-db')
    expect(result).not.toContain('content-db')
  })
})

describe('parseArgs', () => {
  it('разбирает окружение, --services и --volumes', () => {
    expect(parseArgs(['local', '--services', 'gateway,identity', '--volumes'])).toMatchObject({
      env: 'local',
      services: ['gateway', 'identity'],
      volumes: true,
    })
    expect(parseArgs(['dev', '--', '--volumes']).volumes).toBe(true)
  })

  it('отвергает неизвестное окружение', () => {
    expect(() => parseArgs(['staging'])).toThrow(UsageError)
    expect(() => parseArgs([])).toThrow(UsageError)
  })
})

describe('состав окружений (docker compose config)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'blog-infra-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  function services(env: 'local' | 'dev' | 'prod'): string {
    const text = readFileSync(join(ROOT, `infra/env/${env}.env.example`), 'utf8').replaceAll('CHANGE_ME', 'placeholder')
    const env_file = join(dir, `${env}.env`)
    writeFileSync(env_file, text)
    return execFileSync(
      'docker',
      [
        'compose',
        '-f',
        'infra/compose/docker-compose.yml',
        '-f',
        `infra/compose/docker-compose.${env}.yml`,
        '--env-file',
        env_file,
        'config',
        '--services',
      ],
      { cwd: ROOT, encoding: 'utf8' },
    )
  }

  const COMMON = [
    'gateway', 'identity', 'content', 'discussion', 'messaging', 'notification', 'media', 'web',
    'identity-db', 'content-db', 'discussion-db', 'messaging-db', 'notification-db', 'media-db',
    'nats', 'minio', 'minio-init',
    'identity-migrate', 'content-migrate', 'discussion-migrate', 'messaging-migrate', 'notification-migrate', 'media-migrate',
  ]

  it('prod без mock-google и без лишнего сверх FR-126', () => {
    const output = services('prod')
    expect(hasMockGoogle(output)).toBe(false)
    expect(output.split(/\s+/).filter(Boolean).sort()).toEqual([...COMMON].sort())
  })

  it('local и dev добавляют только mock-google', () => {
    for (const env of ['local', 'dev'] as const) {
      expect(services(env).split(/\s+/).filter(Boolean).sort()).toEqual([...COMMON, 'mock-google'].sort())
    }
  })
})

describe('hostEnvFor', () => {
  it('подставляет DATABASE_URL и HTTP_PORT сервиса, PEM остаётся нетронутым', async () => {
    const { hostEnvFor, parseDotenv } = await import('../lib/host-env.ts')
    const values = parseDotenv('# комментарий\nIDENTITY_DATABASE_URL=postgres://i@localhost:5433/identity\nKEY=-----BEGIN\\nabc\\n-----END\n')
    const env = hostEnvFor('identity-service', values)
    expect(env['DATABASE_URL']).toBe('postgres://i@localhost:5433/identity')
    expect(env['HTTP_PORT']).toBe('3001')
    expect(env['KEY']).toBe('-----BEGIN\\nabc\\n-----END')
  })
})

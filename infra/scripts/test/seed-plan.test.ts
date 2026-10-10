import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { UsageError } from '../lib/compose.ts'
import { SEED_SERVICES, SeedForbiddenError, parseSeedRequest, planSeed } from '../lib/seed-plan.ts'

const ROOT = resolve(import.meta.dirname, '../../..')

describe('seed-plan: порядок и состав', () => {
  it('сервисы идут в порядке контракта', () => {
    expect(SEED_SERVICES).toEqual(['identity', 'content', 'discussion', 'messaging', 'notification', 'media'])
  })

  it('по одному одноразовому контейнеру на сервис, без зависимостей', () => {
    const steps = planSeed(parseSeedRequest(['local', 'small']))
    expect(steps.map((step) => step.service)).toEqual([...SEED_SERVICES])
    expect(steps[0]?.compose_args).toEqual(['run', '--rm', '--no-deps', 'identity', 'tsx', 'src/seed.ts', '--profile', 'small'])
  })

  it('в dev seed запускается из собранного образа', () => {
    const steps = planSeed(parseSeedRequest(['dev', 'small']))
    expect(steps[0]?.compose_args).toEqual(['run', '--rm', '--no-deps', 'identity', 'node', 'dist/seed.js', '--profile', 'small'])
  })

  it('новые сервисы добавляются в конец списка', () => {
    const steps = planSeed(parseSeedRequest(['dev', 'large']), [...SEED_SERVICES, 'messaging', 'notification', 'media'])
    expect(steps.map((step) => step.service).slice(-3)).toEqual(['messaging', 'notification', 'media'])
  })
})

describe('seed-plan: якорь', () => {
  it('передаётся каждому сервису как --anchor=…', () => {
    const steps = planSeed(parseSeedRequest(['local', 'small', '--', '--anchor=2026-01-01T00:00:00Z']))
    for (const step of steps) expect(step.compose_args.at(-1)).toBe('--anchor=2026-01-01T00:00:00Z')
  })

  it('поддерживает форму «--anchor <ISO>»', () => {
    expect(parseSeedRequest(['local', 'large', '--anchor', '2026-01-01T00:00:00Z']).anchor).toBe('2026-01-01T00:00:00Z')
  })

  it('без якоря флаг не передаётся', () => {
    for (const step of planSeed(parseSeedRequest(['local', 'small']))) expect(step.compose_args.join(' ')).not.toContain('--anchor')
  })

  it('некорректный якорь — ошибка использования', () => {
    expect(() => parseSeedRequest(['local', 'small', '--anchor=вчера'])).toThrow(UsageError)
  })
})

describe('seed-plan: prod и ошибки использования', () => {
  it('prod отклоняется сразу, ни одного шага не планируется', () => {
    expect(() => parseSeedRequest(['prod', 'small'])).toThrow(SeedForbiddenError)
    expect(() => planSeed({ env: 'prod', profile: 'small', anchor: null })).toThrow(SeedForbiddenError)
  })

  it.each([[['staging', 'small']], [['local']], [['local', 'huge']], [['local', 'small', '--wat']]])('%j — UsageError', (argv) => {
    expect(() => parseSeedRequest(argv)).toThrow(UsageError)
  })

  it('команда `infra:seed prod small` завершается с кодом ≠ 0 и объяснением, не обращаясь к docker', () => {
    const result = spawnSync('pnpm', ['exec', 'tsx', 'infra/scripts/seed.ts', 'prod', 'small'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('prod')
    expect(result.stderr).not.toMatch(/docker|env-файл|Нет файла/i)
  })
})

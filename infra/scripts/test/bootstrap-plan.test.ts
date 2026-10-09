import { describe, expect, it } from 'vitest'
import { BootstrapRefusedError, planBootstrap, readEnvValue } from '../lib/bootstrap-plan.ts'

const CLEAN = ['APP_ENV=prod', 'SUPERADMIN_EMAIL=root@blog.test', 'DATABASE_URL=postgres://db/identity'].join('\n')

describe('bootstrap-plan', () => {
  it('сначала identity, затем content, команда — dist/bootstrap.js', () => {
    const steps = planBootstrap(CLEAN)
    expect(steps.map((step) => step.service)).toEqual(['identity', 'content'])
    expect(steps[0]?.compose_args).toEqual(['run', '--rm', '--no-deps', 'identity', 'node', 'dist/bootstrap.js'])
    expect(steps[1]?.compose_args.at(3)).toBe('content')
  })

  it('заглушка называется первой и шагов нет', () => {
    expect(() => planBootstrap('APP_ENV=prod\nSERVICE_JWT_PRIVATE_KEY=CHANGE_ME\nSUPERADMIN_EMAIL=root@blog.test')).toThrow(
      BootstrapRefusedError,
    )
    expect(() => planBootstrap('APP_ENV=prod\nSERVICE_JWT_PRIVATE_KEY=CHANGE_ME\nSUPERADMIN_EMAIL=root@blog.test')).toThrow(
      /SERVICE_JWT_PRIVATE_KEY/,
    )
  })

  it('без SUPERADMIN_EMAIL команда не планируется', () => {
    expect(() => planBootstrap('APP_ENV=prod\nDATABASE_URL=postgres://db/identity')).toThrow(/SUPERADMIN_EMAIL/)
  })

  it('читает значение переменной, пропуская комментарий', () => {
    expect(readEnvValue('# SUPERADMIN_EMAIL=hidden\nSUPERADMIN_EMAIL=root@blog.test', 'SUPERADMIN_EMAIL')).toBe('root@blog.test')
  })
})

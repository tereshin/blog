import { describe, expect, it } from 'vitest'
import { loadEnv, loadMigrateEnv } from '../../src/config/env.ts'

const valid = {
  APP_ENV: 'local',
  DATABASE_URL: 'postgres://identity:pw@localhost:5433/identity',
  NATS_URL: 'nats://localhost:4222',
  SERVICE_JWT_PUBLIC_KEY: 'key',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3000/v1/auth/callback',
  GOOGLE_ISSUER_URL: 'http://mock-google.localhost:8081',
  SUPERADMIN_EMAIL: 'superadmin@blog.test',
}

describe('identity: окружение', () => {
  it('принимает полный набор переменных', () => {
    expect(loadEnv(valid).HTTP_PORT).toBe(3001)
  })

  it('падает без обязательной переменной, называя её', () => {
    const rest = Object.fromEntries(Object.entries(valid).filter(([key]) => key !== 'GOOGLE_CLIENT_ID'))
    expect(() => loadEnv(rest)).toThrow(/GOOGLE_CLIENT_ID/)
  })

  it('в prod чужой издатель не стартует, настоящий Google — стартует', () => {
    const prod = { ...valid, APP_ENV: 'prod' }
    expect(() => loadEnv({ ...prod, GOOGLE_ISSUER_URL: 'http://mock-google.localhost:8081' })).toThrow(/accounts\.google\.com/)
    expect(() => loadEnv({ ...prod, GOOGLE_ISSUER_URL: 'https://accounts.google.com' })).not.toThrow()
  })

  it('в prod заглушка в секрете или пароле базы роняет старт, в local — нет', () => {
    const prod = { ...valid, APP_ENV: 'prod', GOOGLE_ISSUER_URL: 'https://accounts.google.com' }
    expect(() => loadEnv({ ...prod, GOOGLE_CLIENT_SECRET: 'CHANGE_ME' })).toThrow(/GOOGLE_CLIENT_SECRET/)
    expect(() => loadEnv({ ...prod, DATABASE_URL: 'postgres://identity:CHANGE_ME@db/identity' })).toThrow(/DATABASE_URL/)
    expect(() => loadEnv({ ...valid, GOOGLE_CLIENT_SECRET: 'CHANGE_ME' })).not.toThrow()
  })

  it('миграции требуют только APP_ENV и DATABASE_URL', () => {
    expect(loadMigrateEnv({ APP_ENV: 'local', DATABASE_URL: 'postgres://x' }).DATABASE_URL).toBe('postgres://x')
  })
})

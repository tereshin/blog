import { describe, expect, it } from 'vitest'
import { loadEnv, loadMigrateEnv } from '../../src/config/env.ts'

const valid = {
  APP_ENV: 'local',
  DATABASE_URL: 'postgres://content:secret@localhost:5432/content',
  NATS_URL: 'nats://localhost:4222',
  SERVICE_JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----',
  MEDIA_URL: 'http://localhost:3006',
  PUBLIC_ORIGIN: 'http://localhost:3000',
}

describe('content: окружение', () => {
  it('принимает полный набор и ставит порт по умолчанию', () => {
    expect(loadEnv(valid).HTTP_PORT).toBe(3002)
  })

  it.each(['DATABASE_URL', 'MEDIA_URL', 'PUBLIC_ORIGIN', 'SERVICE_JWT_PUBLIC_KEY'])('падает без %s, называя переменную', (name) => {
    const rest = Object.fromEntries(Object.entries(valid).filter(([key]) => key !== name))
    expect(() => loadEnv(rest)).toThrow(new RegExp(name))
  })

  it('в prod заглушка в пароле базы роняет старт', () => {
    expect(() => loadEnv({ ...valid, APP_ENV: 'prod', DATABASE_URL: 'postgres://content:CHANGE_ME@db/content' })).toThrow(/CHANGE_ME|DATABASE_URL/)
  })

  it('задача миграции требует только DATABASE_URL', () => {
    expect(loadMigrateEnv({ APP_ENV: 'local', DATABASE_URL: valid.DATABASE_URL }).DATABASE_URL).toBe(valid.DATABASE_URL)
  })
})

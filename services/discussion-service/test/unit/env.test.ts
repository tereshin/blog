import { describe, expect, it } from 'vitest'
import { loadEnv } from '../../src/config/env.ts'

const valid = {
  APP_ENV: 'local',
  DATABASE_URL: 'postgres://discussion:secret@localhost:5432/discussion',
  NATS_URL: 'nats://localhost:4222',
  SERVICE_JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----',
}

describe('discussion: окружение', () => {
  it('принимает полный набор и ставит порт по умолчанию', () => {
    expect(loadEnv(valid).HTTP_PORT).toBe(3003)
  })

  it.each(['DATABASE_URL', 'NATS_URL', 'SERVICE_JWT_PUBLIC_KEY'])('падает без %s, называя переменную', (name) => {
    const rest = Object.fromEntries(Object.entries(valid).filter(([key]) => key !== name))
    expect(() => loadEnv(rest)).toThrow(new RegExp(name))
  })
})

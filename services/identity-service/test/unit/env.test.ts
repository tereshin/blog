import { describe, expect, it } from 'vitest'
import { firebaseProdIssuer, loadEnv, loadMigrateEnv } from '../../src/config/env.ts'

const valid = {
  APP_ENV: 'local',
  DATABASE_URL: 'postgres://identity:pw@localhost:5433/identity',
  NATS_URL: 'nats://localhost:4222',
  SERVICE_JWT_PUBLIC_KEY: 'key',
  FIREBASE_PROJECT_ID: 'demo-blog',
  FIREBASE_AUTH_DOMAIN: 'demo-blog.firebaseapp.com',
  FIREBASE_WEB_API_KEY: 'web-key',
  FIREBASE_SERVER_API_KEY: 'server-key',
  FIREBASE_CLIENT_EMAIL: 'firebase@demo-blog.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: 'key',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  SEED_AUTH_PASSWORD: 'seed-password',
  SUPERADMIN_EMAIL: 'superadmin@blog.test',
}

describe('identity: окружение', () => {
  it('принимает полный набор переменных', () => {
    expect(loadEnv(valid).HTTP_PORT).toBe(3001)
    expect(firebaseProdIssuer('demo-blog')).toBe('https://securetoken.google.com/demo-blog')
  })

  it('падает без обязательной переменной, называя её', () => {
    const rest = Object.fromEntries(Object.entries(valid).filter(([key]) => key !== 'FIREBASE_PROJECT_ID'))
    expect(() => loadEnv(rest)).toThrow(/FIREBASE_PROJECT_ID/)
  })

  it('в prod эмулятор и тестовый пароль не стартуют, секрет CHANGE_ME тоже', () => {
    const prod = { ...valid, APP_ENV: 'prod' }
    delete (prod as { FIREBASE_AUTH_EMULATOR_HOST?: string }).FIREBASE_AUTH_EMULATOR_HOST
    delete (prod as { SEED_AUTH_PASSWORD?: string }).SEED_AUTH_PASSWORD
    expect(() => loadEnv(prod)).not.toThrow()
    expect(() => loadEnv({ ...prod, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' })).toThrow(/FIREBASE_AUTH_EMULATOR_HOST/)
    expect(() => loadEnv({ ...prod, SEED_AUTH_PASSWORD: 'secret' })).toThrow(/SEED_AUTH_PASSWORD/)
    expect(() => loadEnv({ ...prod, FIREBASE_PRIVATE_KEY: 'CHANGE_ME' })).toThrow(/FIREBASE_PRIVATE_KEY/)
    expect(() => loadEnv({ ...valid, FIREBASE_PRIVATE_KEY: 'CHANGE_ME' })).not.toThrow()
  })

  it('миграции требуют только APP_ENV и DATABASE_URL', () => {
    expect(loadMigrateEnv({ APP_ENV: 'local', DATABASE_URL: 'postgres://x' }).DATABASE_URL).toBe('postgres://x')
  })
})

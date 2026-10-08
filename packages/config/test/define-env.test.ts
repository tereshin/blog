import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { baseEnvSchema, defineEnv, EnvValidationError, PlaceholderError, rejectPlaceholders } from '../src/index.ts'

const schema = baseEnvSchema.extend({
  DATABASE_URL: z.string().min(1),
  HTTP_PORT: z.coerce.number().int().positive(),
})

describe('defineEnv', () => {
  it('возвращает типизированные значения', () => {
    const env = defineEnv(schema, { APP_ENV: 'local', DATABASE_URL: 'postgres://x', HTTP_PORT: '3000' })
    expect(env).toEqual({ APP_ENV: 'local', DATABASE_URL: 'postgres://x', HTTP_PORT: 3000 })
  })

  it('падает с перечнем отсутствующих переменных', () => {
    try {
      defineEnv(schema, { HTTP_PORT: '3000' })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError)
      expect((error as EnvValidationError).missing).toEqual(['APP_ENV', 'DATABASE_URL'])
    }
  })

  it('отличает некорректные значения от отсутствующих', () => {
    try {
      defineEnv(schema, { APP_ENV: 'staging', DATABASE_URL: 'x', HTTP_PORT: '3000' })
      expect.unreachable()
    } catch (error) {
      expect((error as EnvValidationError).invalid).toEqual(['APP_ENV'])
      expect((error as EnvValidationError).missing).toEqual([])
    }
  })
})

describe('rejectPlaceholders', () => {
  const keys = ['SERVICE_JWT_PRIVATE_KEY', 'GOOGLE_CLIENT_SECRET'] as const

  it('в prod заглушка роняет сервис с именем ключа', () => {
    const env = { APP_ENV: 'prod', SERVICE_JWT_PRIVATE_KEY: 'real', GOOGLE_CLIENT_SECRET: 'CHANGE_ME' }
    expect(() => rejectPlaceholders(env, keys)).toThrow(PlaceholderError)
    expect(() => rejectPlaceholders(env, keys)).toThrow(/GOOGLE_CLIENT_SECRET/)
  })

  it('в local и dev заглушка допустима', () => {
    for (const APP_ENV of ['local', 'dev']) {
      expect(() =>
        rejectPlaceholders({ APP_ENV, SERVICE_JWT_PRIVATE_KEY: 'CHANGE_ME', GOOGLE_CLIENT_SECRET: 'CHANGE_ME' }, keys),
      ).not.toThrow()
    }
  })

  it('не раскрывает значение секрета в сообщении', () => {
    const env = { APP_ENV: 'prod', SERVICE_JWT_PRIVATE_KEY: 'secret-CHANGE_ME-value', GOOGLE_CLIENT_SECRET: 'ok' }
    expect(() => rejectPlaceholders(env, keys)).toThrow(/^(?!.*secret-).*$/s)
  })
})

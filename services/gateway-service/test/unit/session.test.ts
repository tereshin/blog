import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { jwtVerify } from 'jose'
import { SessionService, createContextSigner, guestContext, isCsrfValid, isValidSessionId } from '../../src/modules/session/index.ts'

const info = { user_id: '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22', role: 'member', is_restricted: false, can_publish: true } as const

describe('SessionService', () => {
  it('кэширует ответ identity, в том числе «сессии нет»', async () => {
    const lookup = vi.fn().mockResolvedValueOnce(info).mockResolvedValueOnce(null)
    const sessions = new SessionService(lookup)
    expect(await sessions.resolve('a'.repeat(20))).toEqual(info)
    expect(await sessions.resolve('a'.repeat(20))).toEqual(info)
    expect(lookup).toHaveBeenCalledTimes(1)
    expect(await sessions.resolve('b'.repeat(20))).toBeNull()
    expect(await sessions.resolve('b'.repeat(20))).toBeNull()
    expect(lookup).toHaveBeenCalledTimes(2)
  })

  it('invalidate заставляет перечитать сессию у владельца', async () => {
    const lookup = vi.fn().mockResolvedValue(info)
    const sessions = new SessionService(lookup)
    await sessions.resolve('a'.repeat(20))
    sessions.invalidate(['a'.repeat(20)])
    await sessions.resolve('a'.repeat(20))
    expect(lookup).toHaveBeenCalledTimes(2)
  })

  it('ошибка identity не кэшируется', async () => {
    const lookup = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(info)
    const sessions = new SessionService(lookup)
    await expect(sessions.resolve('a'.repeat(20))).rejects.toThrow('down')
    expect(await sessions.resolve('a'.repeat(20))).toEqual(info)
  })
})

describe('служебный контекст', () => {
  it('подписанный JWT проверяется публичным ключом и живёт не дольше 60 с', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const signer = createContextSigner(privateKey.export({ type: 'pkcs8', format: 'pem' }).toString())
    const token = await signer.sign(guestContext('abc'))
    const { payload } = await jwtVerify(token, publicKey, { algorithms: ['EdDSA'] })
    expect(payload['viewer_key']).toBe('guest:abc')
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBeLessThanOrEqual(60)
  })
})

describe('cookie и CSRF', () => {
  it('идентификатор сессии из cookie проверяется по алфавиту', () => {
    expect(isValidSessionId('abcDEF123_-abcDEF123')).toBe(true)
    expect(isValidSessionId('../../etc/passwd')).toBe(false)
    expect(isValidSessionId('short')).toBe(false)
  })

  it('double-submit: заголовок обязан совпасть с cookie', () => {
    expect(isCsrfValid('token', 'token')).toBe(true)
    expect(isCsrfValid('token', 'other')).toBe(false)
    expect(isCsrfValid(undefined, 'token')).toBe(false)
    expect(isCsrfValid('token', undefined)).toBe(false)
  })
})

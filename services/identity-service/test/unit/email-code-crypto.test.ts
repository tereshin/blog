import { describe, expect, it } from 'vitest'
import { EmailCodeCrypto } from '../../src/modules/auth/index.ts'

const SECRET = 'test-only-stable-email-secret-at-least-32-chars'

describe('email code capabilities', () => {
  it('a code hash cannot be moved to another email, purpose or flow', () => {
    const crypto = new EmailCodeCrypto(SECRET)
    const flow = { id: 'flow-a', email: 'reader@example.test', purpose: 'registration', code_hash: '' }
    flow.code_hash = crypto.hash(flow.id, flow.email, flow.purpose, '012345')
    expect(crypto.matches(flow, '012345')).toBe(true)
    expect(crypto.matches(flow, '543210')).toBe(false)
    expect(crypto.matches({ ...flow, id: 'flow-b' }, '012345')).toBe(false)
    expect(crypto.matches({ ...flow, email: 'other@example.test' }, '012345')).toBe(false)
    expect(crypto.matches({ ...flow, purpose: 'password_reset' }, '012345')).toBe(false)
  })

  it('queued mail survives restarts with the same key, and rejects another key or modified ciphertext', () => {
    const crypto = new EmailCodeCrypto(SECRET)
    const message = { email: 'reader@example.test', code: '012345', purpose: 'registration' }
    const encrypted = crypto.encrypt(message)
    expect(new EmailCodeCrypto(SECRET).decrypt(encrypted)).toEqual(message)
    expect(() => new EmailCodeCrypto('another-test-key-at-least-32-characters').decrypt(encrypted)).toThrow()
    const modified = Buffer.from(encrypted, 'base64')
    modified[modified.length - 1] = (modified.at(-1) ?? 0) ^ 1
    expect(() => crypto.decrypt(modified.toString('base64'))).toThrow()
  })
})

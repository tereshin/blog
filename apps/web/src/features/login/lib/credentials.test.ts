import { describe, expect, it } from 'vitest'
import { credentialFieldError, looksLikeEmail } from './credentials.ts'

describe('looksLikeEmail', () => {
  it('принимает адрес с одной @ и непустыми частями', () => {
    expect(looksLikeEmail('a@b.c')).toBe(true)
  })

  it('отвергает адрес без @, с пробелом и с пустой частью', () => {
    expect(looksLikeEmail('not-an-email')).toBe(false)
    expect(looksLikeEmail('a @b.c')).toBe(false)
    expect(looksLikeEmail('@b.c')).toBe(false)
    expect(looksLikeEmail('a@')).toBe(false)
  })
})

describe('credentialFieldError', () => {
  it('сначала объясняет адрес, затем короткий пароль', () => {
    expect(credentialFieldError('nope', 'short')).toBe('email')
    expect(credentialFieldError('a@b.c', 'short')).toBe('password')
    expect(credentialFieldError('a@b.c', 'long-enough')).toBeNull()
  })
})

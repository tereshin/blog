import { describe, expect, it } from 'vitest'
import { CircuitBreaker, isRetryable, retryDelayMs } from '../src/index.ts'

describe('CircuitBreaker', () => {
  it('открывается после N подряд ошибок и пропускает пробу после паузы', () => {
    let now = 0
    const breaker = new CircuitBreaker({ failure_threshold: 3, reset_timeout_ms: 1000, now: () => now })
    breaker.onFailure()
    breaker.onFailure()
    expect(breaker.canRequest()).toBe(true)
    breaker.onFailure()
    expect(breaker.canRequest()).toBe(false)
    now = 1000
    expect(breaker.current).toBe('half_open')
    expect(breaker.canRequest()).toBe(true)
  })

  it('ошибка в half_open снова открывает, успех закрывает', () => {
    let now = 0
    const breaker = new CircuitBreaker({ failure_threshold: 1, reset_timeout_ms: 100, now: () => now })
    breaker.onFailure()
    now = 100
    breaker.onFailure()
    expect(breaker.current).toBe('open')
    now = 200
    breaker.onSuccess()
    expect(breaker.current).toBe('closed')
  })
})

describe('ретраи', () => {
  it('повторяются только GET и запросы с ключом идемпотентности', () => {
    expect(isRetryable({})).toBe(true)
    expect(isRetryable({ method: 'GET' })).toBe(true)
    expect(isRetryable({ method: 'POST' })).toBe(false)
    expect(isRetryable({ method: 'POST', idempotency_key: 'k' })).toBe(true)
  })

  it('backoff растёт и ограничен 2 с', () => {
    expect(retryDelayMs(0, () => 0)).toBe(50)
    expect(retryDelayMs(0, () => 1)).toBe(100)
    expect(retryDelayMs(10, () => 1)).toBe(2000)
  })
})

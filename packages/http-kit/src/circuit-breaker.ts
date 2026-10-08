export type BreakerState = 'closed' | 'open' | 'half_open'

export type CircuitBreakerOptions = {
  failure_threshold?: number
  reset_timeout_ms?: number
  now?: () => number
}

/** Простой автомат: N подряд ошибок → open; через `reset_timeout_ms` — одна пробная попытка. */
export class CircuitBreaker {
  private state: BreakerState = 'closed'
  private failures = 0
  private opened_at = 0
  private readonly failure_threshold: number
  private readonly reset_timeout_ms: number
  private readonly now: () => number

  constructor(options: CircuitBreakerOptions = {}) {
    this.failure_threshold = options.failure_threshold ?? 5
    this.reset_timeout_ms = options.reset_timeout_ms ?? 10_000
    this.now = options.now ?? Date.now
  }

  get current(): BreakerState {
    if (this.state === 'open' && this.now() - this.opened_at >= this.reset_timeout_ms) {
      this.state = 'half_open'
    }
    return this.state
  }

  canRequest(): boolean {
    return this.current !== 'open'
  }

  onSuccess(): void {
    this.failures = 0
    this.state = 'closed'
  }

  onFailure(): void {
    this.failures += 1
    if (this.state === 'half_open' || this.failures >= this.failure_threshold) {
      this.state = 'open'
      this.opened_at = this.now()
    }
  }
}

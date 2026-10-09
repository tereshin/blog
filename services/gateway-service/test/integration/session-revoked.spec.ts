import { describe, expect, it, vi } from 'vitest'
import { createLogger } from '@blog/logger'
import { SessionService } from '../../src/modules/session/session.service.ts'
import { subscribeSessionRevocations } from '../../src/modules/session/session.revocations.ts'

const USER_ID = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const SESSION_ID = 'a'.repeat(20)
const info = { user_id: USER_ID, role: 'member' as const, is_restricted: false, can_publish: true }

function fakeBus() {
  const pending: unknown[] = []
  let wake: (() => void) | null = null
  let stopped = false
  return {
    push(value: unknown) {
      pending.push(value)
      wake?.()
    },
    connection: {
      subscribe() {
        return {
          async *[Symbol.asyncIterator]() {
            while (!stopped) {
              if (pending.length === 0) {
                await new Promise<void>((resolve) => {
                  wake = resolve
                })
                wake = null
                continue
              }
              const value = pending.shift()
              yield { json: () => value }
            }
          },
          unsubscribe() {
            stopped = true
            wake?.()
          },
        }
      },
    },
  }
}

describe('gateway: identity.session.revoked', () => {
  it('сбрасывает кэш сессии, следующий запрос идёт к identity заново', async () => {
    const lookup = vi.fn().mockResolvedValueOnce(info).mockResolvedValueOnce(null)
    const sessions = new SessionService(lookup)
    expect(await sessions.resolve(SESSION_ID)).toEqual(info)

    const bus = fakeBus()
    let seen = false
    const subscription = subscribeSessionRevocations(
      bus.connection as never,
      sessions,
      createLogger({ service: 'gateway-test', level: 'silent' }),
      () => {
        seen = true
      },
    )
    bus.push({
      event_id: '0b9f6a6e-6f0c-4f64-9d84-6d2f0f8d1c21',
      name: 'identity.session.revoked',
      occurred_at: '2026-10-08T12:00:00.000Z',
      correlation_id: 'c-1',
      causation_id: null,
      version: 1,
      session_ids: [SESSION_ID],
      user_id: USER_ID,
    })
    await vi.waitFor(() => {
      expect(seen).toBe(true)
    })
    expect(await sessions.resolve(SESSION_ID)).toBeNull()
    expect(lookup).toHaveBeenCalledTimes(2)
    subscription.stop()
  })
})

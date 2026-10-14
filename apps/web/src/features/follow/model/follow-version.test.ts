import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { advanceFollowVersion, beginFollowRead } from './follow-version.ts'

const TARGET = 'user-id'

describe('in-flight follow read versions', () => {
  it('invalidates concurrent reads of the changed target only', () => {
    const client = new QueryClient()
    const first = beginFollowRead(client, 'user', [TARGET, 'other'])
    const second = beginFollowRead(client, 'user', [TARGET])
    advanceFollowVersion(client, 'user', TARGET)
    expect(first.isCurrent(0)).toBe(false)
    expect(first.isCurrent(1)).toBe(true)
    expect(second.isCurrent(0)).toBe(false)
    first.release()
    second.release()
  })
  it('retains the guard until the last reader finishes and releases it afterwards', () => {
    const client = new QueryClient()
    const first = beginFollowRead(client, 'user', [TARGET])
    const second = beginFollowRead(client, 'user', [TARGET])
    first.release()
    advanceFollowVersion(client, 'user', TARGET)
    expect(second.isCurrent(0)).toBe(false)
    second.release()
    const next = beginFollowRead(client, 'user', [TARGET])
    expect(next.isCurrent(0)).toBe(true)
    next.release()
    advanceFollowVersion(client, 'user', TARGET)
    // Completed reads no longer have entries that can accumulate mutation versions.
    expect(next.isCurrent(0)).toBe(true)
    client.clear()
  })
  it('isolates query clients and target kinds', () => {
    const client = new QueryClient()
    const other_client = new QueryClient()
    const user = beginFollowRead(client, 'user', [TARGET])
    const topic = beginFollowRead(client, 'topic', [TARGET])
    const other = beginFollowRead(other_client, 'user', [TARGET])
    advanceFollowVersion(client, 'user', TARGET)
    expect(user.isCurrent(0)).toBe(false)
    expect(topic.isCurrent(0)).toBe(true)
    expect(other.isCurrent(0)).toBe(true)
    user.release()
    topic.release()
    other.release()
  })
})

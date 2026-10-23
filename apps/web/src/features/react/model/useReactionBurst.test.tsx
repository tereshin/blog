import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useReactionBurst } from './useReactionBurst.ts'

describe('reaction selection animation', () => {
  it('does not celebrate initial state or changes from another viewer', () => {
    const { result, rerender } = renderHook(({ kind }) => useReactionBurst(kind, vi.fn()), { initialProps: { kind: 'heart' } })
    expect(result.current.burst_kind).toBeNull()
    rerender({ kind: 'fire' })
    expect(result.current.burst_kind).toBeNull()
  })

  it('celebrates a local selection, cleans up and does not replay on rollback or removal', () => {
    const onSelect = vi.fn()
    const { result, rerender } = renderHook(({ kind }: { kind: string | null }) => useReactionBurst(kind, onSelect), { initialProps: { kind: null as string | null } })
    act(() => result.current.handleSelect('fire'))
    expect(onSelect).toHaveBeenCalledWith('fire')
    expect(result.current.burst_kind).toBeNull()
    rerender({ kind: 'fire' })
    expect(result.current.burst_kind).toBe('fire')
    act(() => result.current.handleComplete())
    expect(result.current.burst_kind).toBeNull()
    rerender({ kind: null })
    expect(result.current.burst_kind).toBeNull()
    act(() => result.current.handleSelect('heart'))
    rerender({ kind: 'heart' })
    act(() => result.current.handleSelect('heart'))
    rerender({ kind: null })
    expect(result.current.burst_kind).toBeNull()
  })
})
